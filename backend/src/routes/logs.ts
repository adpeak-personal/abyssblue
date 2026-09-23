import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { notFound, optionalQuery } from "../lib/http.js";
import { createLog, getLogStats, listLogs } from "../repositories/logs.js";
import { findPointById } from "../repositories/points.js";
import { findUserById } from "../repositories/users.js";

const userQuerySchema = z.object({
  userId: optionalQuery(z.coerce.number().int().positive()),
});

const createLogSchema = z
  .object({
    // TODO: bcrypt + JWT + MySQL — 인증 도입 후 userId 는 토큰에서 추출
    userId: z.number().int().positive(),
    date: z.iso.date(),
    pointId: z.number().int().positive(),
    pointName: z.string().min(1).optional(), // 생략 시 포인트 정보에서 채움
    maxDepth: z.number().positive().max(200),
    avgDepth: z.number().positive().max(200),
    bottomTime: z.number().int().positive().max(600),
    waterTemp: z.number().min(-2).max(40),
    visibility: z.number().min(0).max(100),
    suit: z.string().min(1),
    weight: z.number().min(0).max(50),
    tankStart: z.number().int().min(0).max(350),
    tankEnd: z.number().int().min(0).max(350),
    buddy: z.string().optional(),
    sightings: z.array(z.string()).default([]),
    memo: z.string().default(""),
    rating: z.number().int().min(1).max(5),
  })
  .refine((v) => v.avgDepth <= v.maxDepth, { message: "평균 수심은 최대 수심보다 클 수 없습니다.", path: ["avgDepth"] })
  .refine((v) => v.tankEnd <= v.tankStart, { message: "종료 압력은 시작 압력보다 클 수 없습니다.", path: ["tankEnd"] });

export const logRoutes: FastifyPluginAsync = async (app) => {
  app.get("/logs", async (req) => {
    const { userId } = userQuerySchema.parse(req.query);
    return listLogs(userId);
  });

  app.get("/logs/stats", async (req) => {
    const { userId } = userQuerySchema.parse(req.query);
    return getLogStats(userId);
  });

  app.post("/logs", async (req, reply) => {
    const body = createLogSchema.parse(req.body);
    if (!findUserById(body.userId)) return notFound(reply, "사용자를 찾을 수 없습니다.");
    const point = findPointById(body.pointId);
    if (!point) return notFound(reply, "다이빙 포인트를 찾을 수 없습니다.");
    const log = createLog({ ...body, pointName: body.pointName ?? point.name });
    return reply.code(201).send(log);
  });
};
