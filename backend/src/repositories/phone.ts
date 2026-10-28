// 휴대폰 인증 코드 저장소.
//
// 코드는 평문으로 두지 않는다 — DB 가 새어도 진행 중인 인증을 가로챌 수 없게
// SHA-256(코드 + 번호) 로 저장한다. 번호를 섞어서 같은 코드끼리 겹치지 않게 한다.
import { createHash, randomInt } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { execute, query, queryOne } from "../db/pool.js";

export type VerificationPurpose = "signup" | "reset";

/** 코드 유효 시간 */
export const CODE_TTL_MINUTES = 5;
/** 코드를 몇 번까지 틀릴 수 있나 */
export const MAX_ATTEMPTS = 5;
/** 같은 번호로 다시 보낼 수 있을 때까지 */
export const RESEND_COOLDOWN_SECONDS = 180;
/** 번호당 하루 발송 한도 */
export const DAILY_LIMIT_PER_PHONE = 5;
/** IP 당 하루 발송 한도 — 번호를 바꿔가며 긁는 걸 막는다 */
export const DAILY_LIMIT_PER_IP = 20;

/** 숫자만 남긴다 — 010-1234-5678, +82 10 ... 을 모두 같은 값으로 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // +82 10 .... → 010....
  if (digits.startsWith("82") && digits.length >= 11) return "0" + digits.slice(2);
  return digits;
}

/** 한국 휴대폰 번호 형태인지 */
export const isValidPhone = (phone: string) => /^01[016789]\d{7,8}$/.test(phone);

export const generateCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

const hashCode = (code: string, phone: string) =>
  createHash("sha256").update(`${code}:${phone}`).digest("hex");

// ---------------------------------------------------------------------------

interface CountRow extends RowDataPacket {
  n: number;
}

interface LastRow extends RowDataPacket {
  seconds_ago: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** 막혔을 때 사용자에게 보여줄 이유 */
  reason?: string;
  retryAfterSeconds?: number;
}

/**
 * 발송 전 제한 검사.
 *
 * SMS 는 건당 과금이라 제한이 없으면 잔액이 털린다.
 */
export async function checkSendLimits(phone: string, ip: string | undefined): Promise<RateLimitResult> {
  const last = await queryOne<LastRow>(
    `SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS seconds_ago
       FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1`,
    [phone],
  );
  if (last && Number(last.seconds_ago) < RESEND_COOLDOWN_SECONDS) {
    const wait = RESEND_COOLDOWN_SECONDS - Number(last.seconds_ago);
    return {
      ok: false,
      reason: `잠시 후 다시 시도해 주세요. (${wait}초)`,
      retryAfterSeconds: wait,
    };
  }

  const byPhone = await queryOne<CountRow>(
    `SELECT COUNT(*) AS n FROM phone_verifications
      WHERE phone = ? AND created_at >= NOW() - INTERVAL 1 DAY`,
    [phone],
  );
  if (Number(byPhone?.n ?? 0) >= DAILY_LIMIT_PER_PHONE) {
    return { ok: false, reason: "오늘 인증 요청 횟수를 초과했습니다. 내일 다시 시도해 주세요." };
  }

  if (ip) {
    const byIp = await queryOne<CountRow>(
      `SELECT COUNT(*) AS n FROM phone_verifications
        WHERE ip = ? AND created_at >= NOW() - INTERVAL 1 DAY`,
      [ip],
    );
    if (Number(byIp?.n ?? 0) >= DAILY_LIMIT_PER_IP) {
      return { ok: false, reason: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." };
    }
  }

  return { ok: true };
}

export async function createVerification(
  phone: string,
  code: string,
  purpose: VerificationPurpose,
  ip?: string,
) {
  // 같은 번호의 이전 미완료 건은 무효화 — 코드가 여러 개 살아있지 않게
  await execute(
    "DELETE FROM phone_verifications WHERE phone = ? AND verified_at IS NULL AND purpose = ?",
    [phone, purpose],
  );

  await execute(
    `INSERT INTO phone_verifications (phone, code_hash, purpose, expires_at, ip)
     VALUES (?,?,?, NOW() + INTERVAL ? MINUTE, ?)`,
    [phone, hashCode(code, phone), purpose, CODE_TTL_MINUTES, ip ?? null],
  );
}

interface VerificationRow extends RowDataPacket {
  id: number;
  code_hash: string;
  attempts: number;
  expired: number;
}

export type VerifyResult =
  | { ok: true; verificationId: number }
  | { ok: false; reason: string };

export async function verifyCode(
  phone: string,
  code: string,
  purpose: VerificationPurpose,
): Promise<VerifyResult> {
  const row = await queryOne<VerificationRow>(
    `SELECT id, code_hash, attempts, (expires_at < NOW()) AS expired
       FROM phone_verifications
      WHERE phone = ? AND purpose = ? AND verified_at IS NULL
      ORDER BY created_at DESC LIMIT 1`,
    [phone, purpose],
  );

  if (!row) return { ok: false, reason: "인증 요청을 먼저 해주세요." };
  if (Number(row.expired) === 1) return { ok: false, reason: "인증번호가 만료되었습니다. 다시 요청해 주세요." };
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "입력 횟수를 초과했습니다. 다시 요청해 주세요." };
  }

  if (row.code_hash !== hashCode(code, phone)) {
    await execute("UPDATE phone_verifications SET attempts = attempts + 1 WHERE id = ?", [row.id]);
    const left = MAX_ATTEMPTS - (row.attempts + 1);
    return {
      ok: false,
      reason: left > 0 ? `인증번호가 올바르지 않습니다. (${left}회 남음)` : "입력 횟수를 초과했습니다. 다시 요청해 주세요.",
    };
  }

  await execute("UPDATE phone_verifications SET verified_at = NOW() WHERE id = ?", [row.id]);
  return { ok: true, verificationId: row.id };
}

/**
 * "이 번호가 방금 인증됐는지" 확인 — 인증 토큰 검증 후 한 번 더 본다.
 *
 * 용도(purpose)까지 맞춰 본다. 가입용 인증이 비밀번호 재설정으로 통과되면,
 * 남의 번호로 가입 인증만 받아 두고 그 계정의 비밀번호를 바꿀 수 있게 된다.
 */
export async function isRecentlyVerified(
  phone: string,
  purpose: VerificationPurpose = "signup",
  withinMinutes = 30,
): Promise<boolean> {
  const row = await queryOne<CountRow>(
    `SELECT COUNT(*) AS n FROM phone_verifications
      WHERE phone = ? AND purpose = ? AND verified_at IS NOT NULL
        AND verified_at >= NOW() - INTERVAL ? MINUTE`,
    [phone, purpose, withinMinutes],
  );
  return Number(row?.n ?? 0) > 0;
}

/** 만료된 기록 정리 — 주기적으로 돌린다 */
export async function purgeExpired(): Promise<number> {
  const { affectedRows } = await execute(
    "DELETE FROM phone_verifications WHERE expires_at < NOW() - INTERVAL 1 DAY",
  );
  return affectedRows;
}

export async function findUserIdByPhone(phone: string): Promise<number | undefined> {
  const row = await queryOne<RowDataPacket & { id: number }>(
    "SELECT id FROM users WHERE phone = ?",
    [phone],
  );
  return row?.id;
}

export async function listRecentForPhone(phone: string) {
  return query<RowDataPacket>(
    "SELECT id, created_at, verified_at FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 10",
    [phone],
  );
}
