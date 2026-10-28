// 인증 라우트 — 휴대폰 인증 → 가입 → 로그인.
//
// 가입은 3단계다:
//   1) POST /auth/phone/send    번호로 6자리 코드 발송
//   2) POST /auth/phone/verify  코드 확인 → 단기 "인증됨" 토큰 발급
//   3) POST /auth/signup        그 토큰이 있어야 계정 생성
//
// 2단계 토큰을 따로 두는 이유: 가입 폼을 채우는 동안 인증 상태를 들고 있어야 하는데,
// 클라이언트가 "인증했다"고 주장하는 것만 믿을 수는 없기 때문이다.
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { hashPassword, needsRehash, verifyPassword } from "../lib/password.js";
import { getSmsSender } from "../lib/sms.js";
import { RESERVED_EMAIL_MESSAGE, isReservedEmail } from "../lib/reserved-email.js";
import {
  CODE_TTL_MINUTES,
  checkSendLimits,
  createVerification,
  findUserIdByPhone,
  generateCode,
  isRecentlyVerified,
  isValidPhone,
  normalizePhone,
  verifyCode,
} from "../repositories/phone.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByNickname,
  toPublicUser,
  touchLastLogin,
  updatePasswordHash,
} from "../repositories/users.js";

const certAgencySchema = z.enum(["PADI", "SSI", "NAUI", "CMAS", "SDI", "KUDA"]);

const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine(isValidPhone, "휴대폰 번호 형식이 올바르지 않습니다.");

const sendSchema = z.object({ phone: phoneSchema });
const verifySchema = z.object({ phone: phoneSchema, code: z.string().regex(/^\d{6}$/) });

const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(100),
  nickname: z.string().trim().min(2).max(20),
  certAgency: certAgencySchema,
  certLevel: z.string().trim().min(1),
  /** /auth/phone/verify 가 내준 토큰 */
  phoneToken: z.string().min(1, "휴대폰 인증을 먼저 완료해 주세요."),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/** 인증 완료 토큰 — 번호만 담고 30분 만에 만료된다 */
interface PhoneTokenPayload {
  phone: string;
  scope: "phone-verified";
}
const PHONE_TOKEN_TTL = "30m";

/** 비밀번호 재설정 토큰 — 어떤 계정인지까지 담는다 */
interface ResetTokenPayload {
  userId: number;
  phone: string;
  scope: "password-reset";
}
const RESET_TOKEN_TTL = "15m";

const resetSendSchema = z.object({ email: z.email(), phone: phoneSchema });
const resetVerifySchema = z.object({ email: z.email(), phone: phoneSchema, code: z.string().regex(/^\d{6}$/) });
const resetSchema = z.object({
  resetToken: z.string().min(1),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(100),
});

const nicknameSchema = z.string().trim().min(2).max(20);

export const authRoutes: FastifyPluginAsync = async (app) => {
  /**
   * 닉네임 사용 가능 여부 — 가입 폼에서 입력칸을 벗어날 때 호출한다.
   *
   * 닉네임은 게시글마다 공개되는 값이라 조회로 노출될 게 없다.
   * (이메일은 같은 방식으로 열면 가입 여부가 새므로 만들지 않는다.)
   */
  app.get("/auth/check-nickname", async (req, reply) => {
    const parsed = nicknameSchema.safeParse(
      (req.query as { nickname?: string }).nickname ?? "",
    );
    if (!parsed.success) {
      return reply.send({ available: false, reason: "닉네임은 2~20자로 입력해 주세요." });
    }
    const taken = await findUserByNickname(parsed.data);
    return {
      available: !taken,
      reason: taken ? "이미 사용 중인 닉네임입니다." : undefined,
    };
  });

  /**
   * 이메일 사용 가능 여부 — 가입 폼에서 입력칸을 벗어날 때 호출한다.
   *
   * 막힌 주소인지만 알려주고 **가입 여부는 알려주지 않는다** — 그걸 알려주면
   * 아무 주소나 넣어 가입자 목록을 캐낼 수 있다. 중복은 가입할 때 걸린다.
   */
  app.get("/auth/check-email", async (req, reply) => {
    const parsed = z.email().safeParse((req.query as { email?: string }).email ?? "");
    if (!parsed.success) {
      return reply.send({ available: false, reason: "이메일 형식이 올바르지 않습니다." });
    }
    const blocked = isReservedEmail(parsed.data);
    return { available: !blocked, reason: blocked ? RESERVED_EMAIL_MESSAGE : undefined };
  });

  /** 1) 인증번호 발송 */
  app.post("/auth/phone/send", async (req, reply) => {
    const { phone } = sendSchema.parse(req.body);

    // 이미 가입된 번호면 발송하지 않는다 — SMS 비용도 아끼고 가입 중복도 막는다
    if (await findUserIdByPhone(phone)) {
      return reply.code(409).send({ message: "이미 가입된 휴대폰 번호입니다." });
    }

    const limit = await checkSendLimits(phone, req.ip);
    if (!limit.ok) {
      return reply
        .code(429)
        .send({ message: limit.reason, retryAfterSeconds: limit.retryAfterSeconds });
    }

    const code = generateCode();
    await createVerification(phone, code, "signup", req.ip);

    const sms = getSmsSender();
    try {
      await sms.send(phone, `[어비스 블루] 인증번호 ${code} (${CODE_TTL_MINUTES}분 내 입력)`);
    } catch (err) {
      req.log.error({ err }, "SMS 발송 실패");
      return reply.code(502).send({ message: "인증번호를 보내지 못했습니다. 잠시 후 다시 시도해 주세요." });
    }

    // 개발 편의 — 실제 문자가 안 나가는 환경에서만 코드를 돌려준다.
    // 조건이 둘 다 맞아야 한다: 운영이 아니고 + SMS 설정이 없어 콘솔로 빠지는 상태.
    // 운영에서는 Aligo 가 설정되므로 sms.kind 가 "aligo" 라 절대 포함되지 않는다.
    const devCode =
      process.env.NODE_ENV !== "production" && sms.kind === "console" ? code : undefined;

    return { sent: true, expiresInMinutes: CODE_TTL_MINUTES, devCode };
  });

  /** 2) 인증번호 확인 */
  app.post("/auth/phone/verify", async (req, reply) => {
    const { phone, code } = verifySchema.parse(req.body);

    const result = await verifyCode(phone, code, "signup");
    if (!result.ok) return reply.code(400).send({ message: result.reason });

    const payload: PhoneTokenPayload = { phone, scope: "phone-verified" };
    const phoneToken = app.jwt.sign(payload as never, { expiresIn: PHONE_TOKEN_TTL });
    return { verified: true, phoneToken };
  });

  /** 3) 가입 */
  app.post("/auth/signup", async (req, reply) => {
    const body = signupSchema.parse(req.body);

    // 이메일부터 본다 — 휴대폰 인증을 먼저 시키면 문자 비용만 쓰고 거절당한다.
    // (허용 목록은 lib/reserved-email.ts)
    if (isReservedEmail(body.email)) {
      return reply.code(400).send({ message: RESERVED_EMAIL_MESSAGE });
    }

    // 인증 토큰이 진짜인지 + 어떤 번호인지 확인
    let phone: string;
    try {
      const payload = app.jwt.verify<PhoneTokenPayload>(body.phoneToken);
      if (payload.scope !== "phone-verified") throw new Error("scope");
      phone = payload.phone;
    } catch {
      return reply.code(400).send({ message: "휴대폰 인증이 만료되었습니다. 다시 인증해 주세요." });
    }

    // 토큰만 믿지 않고 DB 기록도 확인한다 (토큰 유출·재사용 대비)
    if (!(await isRecentlyVerified(phone, "signup"))) {
      return reply.code(400).send({ message: "휴대폰 인증이 만료되었습니다. 다시 인증해 주세요." });
    }

    if (await findUserByEmail(body.email)) {
      return reply.code(409).send({ message: "이미 가입된 이메일입니다." });
    }
    if (await findUserByNickname(body.nickname)) {
      return reply.code(409).send({ message: "이미 사용 중인 닉네임입니다." });
    }
    if (await findUserIdByPhone(phone)) {
      return reply.code(409).send({ message: "이미 가입된 휴대폰 번호입니다." });
    }

    const user = await createUser({
      nickname: body.nickname,
      email: body.email,
      phone,
      passwordHash: await hashPassword(body.password),
      avatarColor: "#0e7490",
      level: "새싹",
      certAgency: body.certAgency,
      certLevel: body.certLevel,
      totalDives: 0,
      joinedAt: new Date().toISOString().slice(0, 10),
    });

    const token = app.issueToken(reply, {
      id: user.id,
      nickname: user.nickname,
      level: user.level,
    });
    return reply.code(201).send({ user: toPublicUser(user), token });
  });

  /** 로그인 */
  app.post("/auth/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const user = await findUserByEmail(body.email);

    // 없는 계정과 틀린 비밀번호를 구분해서 알려주지 않는다 (계정 존재 여부 노출 방지)
    const fail = () => reply.code(401).send({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    if (!user) {
      // 존재하지 않는 계정도 해시 검증과 비슷한 시간을 쓰게 해 타이밍으로 구분되지 않게 한다
      await verifyPassword(body.password, "scrypt$32768$8$1$AAAA$AAAA");
      return fail();
    }

    if (!(await verifyPassword(body.password, user.passwordHash ?? ""))) return fail();

    // 해시 비용을 올린 뒤 첫 로그인이면 조용히 다시 저장한다
    if (user.passwordHash && needsRehash(user.passwordHash)) {
      await updatePasswordHash(user.id, await hashPassword(body.password));
    }
    await touchLastLogin(user.id);

    const token = app.issueToken(reply, {
      id: user.id,
      nickname: user.nickname,
      level: user.level,
    });
    return { user: toPublicUser(user), token };
  });

  // -------------------------------------------------------------------------
  // 비밀번호 찾기 — 가입 때 인증한 휴대폰으로 본인 확인을 한다.
  //
  // 이메일로 재설정 링크를 보내는 방식을 안 쓰는 이유: 메일 발송 수단이 따로 없고,
  // 이미 가입 시 휴대폰을 인증받아 두었으므로 같은 수단을 쓰는 게 확실하다.
  // -------------------------------------------------------------------------

  /** 1) 재설정 인증번호 발송 — 이메일과 휴대폰이 같은 계정의 것이어야 한다 */
  app.post("/auth/password/send", async (req, reply) => {
    const { email, phone } = resetSendSchema.parse(req.body);

    const user = await findUserByEmail(email);
    const matched = user && user.phone === phone;

    // 안 맞아도 "그런 계정 없다" 고 알려주지 않는다 — 가입 여부가 새면 안 된다.
    // 대신 문자도 보내지 않으므로 틀린 사람은 코드를 못 받는다.
    if (!matched) {
      return { sent: true, expiresInMinutes: CODE_TTL_MINUTES };
    }

    const limit = await checkSendLimits(phone, req.ip);
    if (!limit.ok) {
      return reply
        .code(429)
        .send({ message: limit.reason, retryAfterSeconds: limit.retryAfterSeconds });
    }

    const code = generateCode();
    await createVerification(phone, code, "reset", req.ip);

    const sms = getSmsSender();
    try {
      await sms.send(phone, `[어비스 블루] 비밀번호 재설정 인증번호 ${code} (${CODE_TTL_MINUTES}분 내 입력)`);
    } catch (err) {
      req.log.error({ err }, "SMS 발송 실패");
      return reply.code(502).send({ message: "인증번호를 보내지 못했습니다. 잠시 후 다시 시도해 주세요." });
    }

    const devCode =
      process.env.NODE_ENV !== "production" && sms.kind === "console" ? code : undefined;
    return { sent: true, expiresInMinutes: CODE_TTL_MINUTES, devCode };
  });

  /** 2) 인증번호 확인 → 재설정 토큰 */
  app.post("/auth/password/verify", async (req, reply) => {
    const { email, phone, code } = resetVerifySchema.parse(req.body);

    const fail = () => reply.code(400).send({ message: "인증 정보가 올바르지 않습니다." });

    const user = await findUserByEmail(email);
    if (!user || user.phone !== phone) return fail();

    const result = await verifyCode(phone, code, "reset");
    if (!result.ok) return reply.code(400).send({ message: result.reason });

    const payload: ResetTokenPayload = { userId: user.id, phone, scope: "password-reset" };
    const resetToken = app.jwt.sign(payload as never, { expiresIn: RESET_TOKEN_TTL });
    return { verified: true, resetToken };
  });

  /** 3) 새 비밀번호 저장 */
  app.post("/auth/password/reset", async (req, reply) => {
    const body = resetSchema.parse(req.body);

    const expired = () =>
      reply.code(400).send({ message: "인증이 만료되었습니다. 처음부터 다시 진행해 주세요." });

    let payload: ResetTokenPayload;
    try {
      payload = app.jwt.verify<ResetTokenPayload>(body.resetToken);
      if (payload.scope !== "password-reset") throw new Error("scope");
    } catch {
      return expired();
    }

    // 토큰만 믿지 않는다 — DB 기록도 확인한다 (토큰 유출·재사용 대비)
    if (!(await isRecentlyVerified(payload.phone, "reset", 15))) return expired();

    const user = await findUserById(payload.userId);
    if (!user || user.phone !== payload.phone) return expired();

    await updatePasswordHash(user.id, await hashPassword(body.password));

    // 바꾼 김에 바로 로그인시킨다 — 다시 입력하게 할 이유가 없다
    const token = app.issueToken(reply, {
      id: user.id,
      nickname: user.nickname,
      level: user.level,
    });
    return { user: toPublicUser(user), token };
  });

  /** 로그아웃 — 쿠키를 지운다. Bearer 를 쓰는 앱은 저장소에서 토큰을 버리면 된다 */
  app.post("/auth/logout", async (_req, reply) => {
    app.clearToken(reply);
    return { ok: true };
  });

  /**
   * 현재 로그인 사용자 — 프론트가 세션 복원에 쓴다.
   *
   * 토큰만 믿지 않고 DB 를 확인한다. 토큰은 30일짜리라, 확인하지 않으면
   * 탈퇴·삭제된 계정이 계속 로그인 상태로 보이고 등급 변경(운영진 승격 등)도
   * 토큰이 만료될 때까지 반영되지 않는다.
   */
  app.get("/auth/me", async (req, reply) => {
    if (!req.authUser) return reply.code(401).send({ message: "로그인이 필요합니다." });

    const user = await findUserById(req.authUser.id);
    if (!user) {
      app.clearToken(reply);
      return reply.code(401).send({ message: "로그인이 필요합니다." });
    }

    // 등급은 DB 값을 따른다
    return { user: { id: user.id, nickname: user.nickname, level: user.level } };
  });
};
