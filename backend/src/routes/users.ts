import type { FastifyPluginAsync } from "fastify";
import { idParamSchema, notFound } from "../lib/http.js";
import { findPublicUserById } from "../repositories/users.js";

export const userRoutes: FastifyPluginAsync = async (app) => {
  // 공개 프로필 — email 제외
  app.get("/users/:id", async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const user = findPublicUserById(id);
    if (!user) return notFound(reply, "사용자를 찾을 수 없습니다.");
    return user;
  });
};
