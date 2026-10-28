import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { notFound, optionalQuery } from "../lib/http.js";
import { createLog, getLogStats, listLogs } from "../repositories/logs.js";
import { findPointById } from "../repositories/points.js";
import { findPublicUsersByIds } from "../repositories/users.js";
import { refreshLevel } from "../repositories/levels.js";
import { notify } from "../repositories/notifications.js";

const userQuerySchema = z.object({
  userId: optionalQuery(z.coerce.number().int().positive()),
});

const logQuerySchema = userQuerySchema.extend({
  pointId: optionalQuery(z.coerce.number().int().positive()),
  limit: optionalQuery(z.coerce.number().int().min(1).max(100)),
});

const createLogSchema = z
  .object({
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
    diveTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    entryType: z.enum(["보트", "비치"]).optional(),
    current: z.enum(["없음", "약함", "보통", "강함"]).optional(),
    weather: z.enum(["맑음", "흐림", "비"]).optional(),
    waves: z.enum(["잔잔", "약간", "높음"]).optional(),
    tank: z.string().max(50).optional(),
    /** 끄면 포인트 상세의 "최근 회원 로그" 에 안 뜬다 */
    isPublic: z.boolean().default(true),
    sightings: z.array(z.string()).default([]),
    memo: z.string().default(""),
    rating: z.number().int().min(1).max(5),
  })
  .refine((v) => v.avgDepth <= v.maxDepth, { message: "평균 수심은 최대 수심보다 클 수 없습니다.", path: ["avgDepth"] })
  .refine((v) => v.tankEnd <= v.tankStart, { message: "종료 압력은 시작 압력보다 클 수 없습니다.", path: ["tankEnd"] });

export const logRoutes: FastifyPluginAsync = async (app) => {
  app.get("/logs", async (req) => {
    const q = logQuerySchema.parse(req.query);
    const logs = await listLogs(q);

    // 포인트 상세의 "최근 회원 로그" 는 남의 로그라 누가 썼는지 보여야 한다.
    // 내 로그북(userId 지정)에는 필요 없으니 그때는 조회하지 않는다.
    if (q.userId !== undefined) return logs;
    const users = await findPublicUsersByIds(logs.map((l) => l.userId));
    return logs.map((l) => ({ ...l, user: users.get(l.userId) ?? null }));
  });

  app.get("/logs/stats", async (req) => {
    const { userId } = userQuerySchema.parse(req.query);
    return await getLogStats(userId);
  });

  // 로그는 본인 것만 쓴다 — userId 를 본문으로 받으면 남의 로그북에 끼워넣을 수 있다
  app.post("/logs", { onRequest: app.requireAuth }, async (req, reply) => {
    const userId = req.authUser!.id;
    const body = createLogSchema.parse(req.body);
    const point = await findPointById(body.pointId);
    if (!point) return notFound(reply, "다이빙 포인트를 찾을 수 없습니다.");
    const log = await createLog({ ...body, userId, pointName: body.pointName ?? point.name });

    // 산호·고래는 로그 수가 조건이라 로그를 쓴 뒤에도 확인한다
    void refreshLevel(userId)
      .then((p) => {
        if (!p) return;
        return notify({
          userId,
          type: "운영",
          message: `축하합니다! 등급이 ${p.to} 로 올라갔어요.`,
          link: "/mypage",
        });
      })
      .catch((err) => req.log.warn({ err }, "등급 갱신 실패"));

    return reply.code(201).send(log);
  });
};
