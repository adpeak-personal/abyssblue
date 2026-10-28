// 소셜 로그인 라우트 — 카카오 / 네이버.
//
// 흐름
//   1) GET  /auth/oauth/:provider           동의 화면으로 보낸다
//   2) GET  /auth/oauth/:provider/callback  돌아온 code 로 프로필을 받는다
//        · 이미 연결된 계정    → 바로 로그인
//        · 같은 이메일의 계정  → 그 계정에 연결하고 로그인
//        · 처음 보는 사람      → 추가 정보 화면으로 (닉네임·자격증·휴대폰 인증)
//   3) POST /auth/signup/social             추가 정보를 받아 계정 생성
//
// 소셜만으로 계정을 바로 만들지 않는 이유: 이 커뮤니티는 가입에 휴대폰 인증이 필요하고
// 닉네임·자격증은 소셜이 알려주지 않는다. 그걸 빈 값으로 채우면 회원 정보가 망가진다.
import { randomBytes } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { OAuthError, authorizeUrl, configuredProviders, fetchProfile } from "../lib/oauth.js";
import { isRecentlyVerified, findUserIdByPhone } from "../repositories/phone.js";
import {
  createUser,
  findUserByEmail,
  findUserByNickname,
  findUserByProvider,
  linkProvider,
  toPublicUser,
  touchLastLogin,
} from "../repositories/users.js";
import { RESERVED_EMAIL_MESSAGE, isReservedEmail } from "../lib/reserved-email.js";
import type { SocialProvider } from "../types.js";

const PROVIDERS = ["kakao", "naver"] as const;
const providerParamSchema = z.object({ provider: z.enum(PROVIDERS) });

/** CSRF 방지용 state 를 담아 두는 쿠키 — 콜백 한 번 쓰고 버린다 */
const STATE_COOKIE = "abyss_oauth_state";
/** 추가 정보 입력 단계를 버티는 토큰 */
const SOCIAL_COOKIE = "abyss_social";
const SOCIAL_TOKEN_TTL = "30m";

interface SocialTokenPayload {
  provider: SocialProvider;
  providerId: string;
  email?: string;
  scope: "social-signup";
}

const certAgencySchema = z.enum(["PADI", "SSI", "NAUI", "CMAS", "SDI", "KUDA"]);

const socialSignupSchema = z.object({
  email: z.email(),
  nickname: z.string().trim().min(2).max(20),
  certAgency: certAgencySchema,
  certLevel: z.string().trim().min(1),
  /** /auth/phone/verify 가 내준 토큰 — 소셜이어도 휴대폰 인증은 받는다 */
  phoneToken: z.string().min(1, "휴대폰 인증을 먼저 완료해 주세요."),
});

interface PhoneTokenPayload {
  phone: string;
  scope: "phone-verified";
}

/** 로그인 성공 후 돌려보낼 웹 주소 */
const webOrigin = () =>
  (process.env.CORS_ORIGIN ?? "http://localhost:5000").split(",")[0].trim();

export const oauthRoutes: FastifyPluginAsync = async (app) => {
  /** 로그인 화면이 어떤 버튼을 켤지 정하는 데 쓴다 */
  app.get("/auth/oauth/providers", async () => ({ providers: configuredProviders() }));

  /** 1) 동의 화면으로 */
  app.get("/auth/oauth/:provider", async (req, reply) => {
    const { provider } = providerParamSchema.parse(req.params);

    const state = randomBytes(16).toString("hex");
    reply.setCookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });

    try {
      return reply.redirect(authorizeUrl(provider, state));
    } catch (err) {
      if (err instanceof OAuthError) {
        return reply.code(503).send({ message: "아직 준비 중인 로그인 방식입니다." });
      }
      throw err;
    }
  });

  /** 2) 콜백 */
  app.get("/auth/oauth/:provider/callback", async (req, reply) => {
    const { provider } = providerParamSchema.parse(req.params);
    const q = req.query as { code?: string; state?: string; error?: string };

    // 사용자가 동의 화면에서 취소한 경우
    if (q.error || !q.code) {
      return reply.redirect(`${webOrigin()}/login?social=cancelled`);
    }

    // 우리가 보낸 state 와 같아야 한다 — 남이 만든 콜백 요청을 받지 않기 위해
    const expected = req.cookies[STATE_COOKIE];
    reply.clearCookie(STATE_COOKIE, { path: "/" });
    if (!expected || expected !== q.state) {
      return reply.redirect(`${webOrigin()}/login?social=invalid`);
    }

    let profile;
    try {
      profile = await fetchProfile(provider, q.code);
    } catch (err) {
      req.log.error({ err }, "소셜 프로필 조회 실패");
      return reply.redirect(`${webOrigin()}/login?social=failed`);
    }

    const login = async (user: Awaited<ReturnType<typeof findUserByEmail>>) => {
      if (!user) return;
      await touchLastLogin(user.id);
      app.issueToken(reply, { id: user.id, nickname: user.nickname, level: user.level });
      return reply.redirect(`${webOrigin()}/`);
    };

    // 이미 연결된 계정
    const linked = await findUserByProvider(provider, profile.id);
    if (linked) return login(linked);

    // 같은 이메일로 이미 가입한 사람 — 새 계정을 만들지 않고 묶는다
    if (profile.email) {
      const existing = await findUserByEmail(profile.email);
      if (existing) {
        await linkProvider(existing.id, provider, profile.id);
        return login(existing);
      }
    }

    // 처음 보는 사람 — 추가 정보를 받아야 한다.
    // 토큰은 쿠키로 넘긴다. 주소창에 실으면 브라우저 기록·리퍼러에 남는다.
    const payload: SocialTokenPayload = {
      provider,
      providerId: profile.id,
      email: profile.email,
      scope: "social-signup",
    };
    reply.setCookie(SOCIAL_COOKIE, app.jwt.sign(payload as never, { expiresIn: SOCIAL_TOKEN_TTL }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 30,
    });

    const params = new URLSearchParams({ provider });
    if (profile.email) params.set("email", profile.email);
    if (profile.nickname) params.set("nickname", profile.nickname);
    return reply.redirect(`${webOrigin()}/signup/social?${params}`);
  });

  /** 추가 정보 화면이 "지금 어떤 소셜로 들어왔는지" 확인하는 용도 */
  app.get("/auth/signup/social", async (req, reply) => {
    const payload = readSocialToken(req.cookies[SOCIAL_COOKIE]);
    if (!payload) {
      return reply.code(400).send({ message: "소셜 인증이 만료되었습니다. 다시 시도해 주세요." });
    }
    return { provider: payload.provider, email: payload.email ?? null };
  });

  /** 3) 추가 정보를 받아 계정 생성 */
  app.post("/auth/signup/social", async (req, reply) => {
    const body = socialSignupSchema.parse(req.body);

    const social = readSocialToken(req.cookies[SOCIAL_COOKIE]);
    if (!social) {
      return reply.code(400).send({ message: "소셜 인증이 만료되었습니다. 다시 시도해 주세요." });
    }

    // 휴대폰 인증은 일반 가입과 똑같이 받는다
    let phone: string;
    try {
      const payload = app.jwt.verify<PhoneTokenPayload>(body.phoneToken);
      if (payload.scope !== "phone-verified") throw new Error("scope");
      phone = payload.phone;
    } catch {
      return reply.code(400).send({ message: "휴대폰 인증이 만료되었습니다. 다시 인증해 주세요." });
    }
    if (!(await isRecentlyVerified(phone, "signup"))) {
      return reply.code(400).send({ message: "휴대폰 인증이 만료되었습니다. 다시 인증해 주세요." });
    }

    // 일반 가입과 같은 규칙 — 소셜로 우회할 수 있으면 막는 의미가 없다
    if (isReservedEmail(body.email)) {
      return reply.code(400).send({ message: RESERVED_EMAIL_MESSAGE });
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
    if (await findUserByProvider(social.provider, social.providerId)) {
      return reply.code(409).send({ message: "이미 연결된 소셜 계정입니다." });
    }

    const user = await createUser({
      nickname: body.nickname,
      email: body.email,
      phone,
      // 비밀번호 없이 만든다 — 로그인은 소셜로만 된다.
      // 나중에 비밀번호를 쓰고 싶으면 "비밀번호 찾기" 로 설정하면 된다.
      passwordHash: "",
      provider: social.provider,
      providerId: social.providerId,
      avatarColor: "#0e7490",
      level: "새싹",
      certAgency: body.certAgency,
      certLevel: body.certLevel,
      totalDives: 0,
      joinedAt: new Date().toISOString().slice(0, 10),
    });

    reply.clearCookie(SOCIAL_COOKIE, { path: "/" });
    const token = app.issueToken(reply, {
      id: user.id,
      nickname: user.nickname,
      level: user.level,
    });
    return reply.code(201).send({ user: toPublicUser(user), token });
  });

  function readSocialToken(raw: string | undefined): SocialTokenPayload | null {
    if (!raw) return null;
    try {
      const payload = app.jwt.verify<SocialTokenPayload>(raw);
      return payload.scope === "social-signup" ? payload : null;
    } catch {
      return null;
    }
  }
};
