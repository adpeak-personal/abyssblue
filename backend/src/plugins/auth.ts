// 인증 플러그인 — JWT 발급·검증, 로그인/운영진 가드.
//
// 토큰을 두 경로로 받는다:
//   - httpOnly 쿠키  : 웹. JS 가 읽을 수 없어 XSS 에 강하다
//   - Bearer 헤더    : 앱(Flutter). 쿠키를 다루기 번거로운 환경
// 같은 API 로 웹과 앱을 모두 커버하기 위해서다.
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { RowDataPacket } from "mysql2";
import { queryOne } from "../db/pool.js";
import type { MemberLevel } from "../types.js";

interface AccountStateRow extends RowDataPacket {
  status: "활동" | "정지" | "탈퇴";
  suspended_until: string | null;
  status_reason: string | null;
}

/** 정지·탈퇴 여부 확인 — 쓰기 길목에서만 부른다 */
async function getAccountState(id: number) {
  const row = await queryOne<AccountStateRow>(
    "SELECT status, suspended_until, status_reason FROM users WHERE id = ?",
    [id],
  );
  if (!row) return null;
  return {
    status: row.status,
    suspendedUntil: row.suspended_until ?? undefined,
    reason: row.status_reason ?? undefined,
  };
}

export const AUTH_COOKIE = "abyss_token";
const TOKEN_TTL = "30d";

export interface AuthUser {
  id: number;
  nickname: string;
  level: MemberLevel;
}

declare module "fastify" {
  interface FastifyInstance {
    /** 로그인 필수 — 아니면 401 */
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** 운영진 전용 — 아니면 401/403 */
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** 로그인 응답에 쿠키를 심는다 */
    issueToken: (reply: FastifyReply, user: AuthUser) => string;
    clearToken: (reply: FastifyReply) => void;
  }
  interface FastifyRequest {
    /** 토큰이 있으면 채워진다. 없으면 undefined */
    authUser?: AuthUser;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

/**
 * 운영 환경에서 JWT_SECRET 이 없으면 켜지 않는다.
 * 개발 중에는 임시 키로 돌아가되 경고를 띄운다 — 조용히 약한 키로 뜨면 안 된다.
 */
function resolveSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET 이 없거나 너무 짧습니다 (32자 이상 필요). 운영에서는 필수입니다.");
  }
  console.warn(
    "⚠️  JWT_SECRET 이 없어 임시 키로 동작합니다. 서버를 재시작하면 모든 로그인이 풀립니다.\n" +
      "   `npm run gen:secret` 으로 만들어 .env 에 넣으세요.",
  );
  return "dev-only-insecure-secret-" + "0".repeat(32);
}

const plugin: FastifyPluginAsync = async (app) => {
  await app.register(cookie);
  await app.register(jwt, {
    secret: resolveSecret(),
    cookie: { cookieName: AUTH_COOKIE, signed: false },
    sign: { expiresIn: TOKEN_TTL },
  });

  app.decorateRequest("authUser", undefined);

  // 토큰이 있으면 매 요청마다 풀어둔다 (없어도 통과 — 가드가 따로 막는다)
  app.addHook("onRequest", async (req) => {
    try {
      await req.jwtVerify();
      req.authUser = req.user;
    } catch {
      req.authUser = undefined;
    }
  });

  app.decorate("requireAuth", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.authUser) {
      return reply.code(401).send({ message: "로그인이 필요합니다." });
    }

    // 토큰은 30일짜리다. 정지·탈퇴 처리를 해도 토큰이 살아 있으면 계속 글을 쓸 수 있으므로
    // 쓰기 권한이 필요한 길목에서 상태를 확인한다.
    const state = await getAccountState(req.authUser.id);
    if (!state || state.status === "탈퇴") {
      app.clearToken(reply);
      return reply.code(401).send({ message: "사용할 수 없는 계정입니다." });
    }
    if (state.status === "정지") {
      const until = state.suspendedUntil
        ? ` (${state.suspendedUntil.slice(0, 10)} 까지)`
        : "";
      return reply.code(403).send({
        message: `이용이 정지된 계정입니다${until}.${state.reason ? ` 사유: ${state.reason}` : ""}`,
      });
    }
  });

  app.decorate("requireAdmin", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.authUser) {
      return reply.code(401).send({ message: "로그인이 필요합니다." });
    }
    if (req.authUser.level !== "운영진") {
      return reply.code(403).send({ message: "운영진만 접근할 수 있습니다." });
    }
  });

  app.decorate("issueToken", (reply: FastifyReply, user: AuthUser) => {
    const token = app.jwt.sign(user);
    reply.setCookie(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return token;
  });

  app.decorate("clearToken", (reply: FastifyReply) => {
    reply.clearCookie(AUTH_COOKIE, { path: "/" });
  });
};

export const authPlugin = fp(plugin, { name: "auth" });
