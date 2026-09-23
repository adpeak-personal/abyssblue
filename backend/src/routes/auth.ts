// 인증 라우트 — 현재는 스텁(stub)입니다.
// TODO: bcrypt + JWT + MySQL
//   - signup: bcrypt 로 비밀번호 해시 후 users 테이블에 저장
//   - login : bcrypt.compare 로 검증 후 JWT 발급 (httpOnly 쿠키 또는 Bearer)
import { randomBytes } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createUser, findUserByEmail, findUserByNickname, toPublicUser } from "../repositories/users.js";

const certAgencySchema = z.enum(["PADI", "SSI", "NAUI", "CMAS", "SDI", "KUDA"]);

const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  nickname: z.string().trim().min(2).max(20),
  certAgency: certAgencySchema,
  certLevel: z.string().trim().min(1),
  region: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// TODO: bcrypt + JWT + MySQL — 실제 JWT 로 교체
const fakeToken = (userId: number) => `fake-token.${userId}.${randomBytes(12).toString("hex")}`;

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/signup", async (req, reply) => {
    const body = signupSchema.parse(req.body);
    if (findUserByEmail(body.email)) return reply.code(409).send({ message: "이미 가입된 이메일입니다." });
    if (findUserByNickname(body.nickname)) return reply.code(409).send({ message: "이미 사용 중인 닉네임입니다." });

    // TODO: bcrypt + JWT + MySQL — 비밀번호 해시 저장 (현재는 저장하지 않음)
    const user = createUser({
      nickname: body.nickname,
      email: body.email,
      avatarColor: "#0e7490",
      level: "새싹",
      certAgency: body.certAgency,
      certLevel: body.certLevel,
      totalDives: 0,
      joinedAt: new Date().toISOString().slice(0, 10),
      region: body.region ?? "",
    });
    return reply.code(201).send({ user: toPublicUser(user), token: fakeToken(user.id) });
  });

  app.post("/auth/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);
    // TODO: bcrypt + JWT + MySQL — 현재는 비밀번호 검증 없이 존재하는 이메일이면 성공
    const user = findUserByEmail(body.email);
    if (!user) return reply.code(401).send({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    return { user: toPublicUser(user), token: fakeToken(user.id) };
  });
};
