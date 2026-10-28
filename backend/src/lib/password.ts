// 비밀번호 해시.
//
// bcrypt 대신 Node 내장 scrypt 를 쓴다:
//   - OWASP 가 권장하는 메모리 하드 KDF 중 하나다 (argon2id > scrypt > bcrypt)
//   - 의존성이 없다. bcrypt 는 네이티브 빌드가 필요해 윈도우/도커에서 자주 깨지고,
//     공급망 위험도 하나 늘어난다
//
// 저장 형식: `scrypt$N$r$p$<salt base64>$<hash base64>`
// 파라미터를 같이 저장하므로 나중에 비용을 올려도 기존 해시가 그대로 검증된다.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem?: number },
) => Promise<Buffer>;

/** 현재 비용 — 올릴 때 이 값만 바꾸면 된다 (기존 해시는 저장된 값으로 검증됨) */
const PARAMS = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LEN = 32;
const SALT_LEN = 16;

/** N 이 크면 기본 maxmem(32MB)을 넘겨 에러가 난다 */
const maxmem = (N: number, r: number) => 256 * N * r * 2;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const { N, r, p } = PARAMS;
  const hash = await scrypt(password.normalize("NFKC"), salt, KEY_LEN, {
    ...PARAMS,
    maxmem: maxmem(N, r),
  });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");

  let actual: Buffer;
  try {
    actual = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N,
      r,
      p,
      maxmem: maxmem(N, r),
    });
  } catch {
    return false;
  }

  // 길이가 다르면 timingSafeEqual 이 던진다
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** 저장된 해시가 현재 비용보다 약하면 true — 로그인 성공 시 다시 저장하면 된다 */
export function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return true;
  return Number(parts[1]) < PARAMS.N;
}
