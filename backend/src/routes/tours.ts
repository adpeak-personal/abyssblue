import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";
import { idParamSchema, notFound, optionalQuery } from "../lib/http.js";
import {
  createTour,
  deleteTour,
  findParticipant,
  findTourById,
  joinTour,
  leaveTour,
  listMyTours,
  listParticipants,
  listTours,
  setParticipantStatus,
  updateTour,
} from "../repositories/tours.js";
import { findPublicUsersByIds } from "../repositories/users.js";
import type { MemberLevel, Tour } from "../types.js";

const TYPES = ["번개", "정기투어", "해외투어", "교육"] as const;
const REGIONS = ["동해", "남해", "제주", "서해", "해외"] as const;

const tourQuerySchema = z.object({
  type: optionalQuery(z.enum(TYPES)),
  status: optionalQuery(z.enum(["모집중", "마감임박", "마감"])),
});

/** YYYY-MM-DD 만 받는다 — DATE 컬럼이라 시각이 붙으면 그대로 들어가지 않는다 */
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.");

const tourBodySchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    type: z.enum(TYPES),
    pointName: z.string().trim().min(1).max(100),
    region: z.enum(REGIONS),
    startDate: dateSchema,
    endDate: dateSchema,
    capacity: z.number().int().min(1).max(500),
    price: z.number().int().min(0),
    minCert: z.string().trim().max(100).default(""),
    joinMode: z.enum(["선착순", "승인제"]),
    description: z.string().trim().min(1).max(5000),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "끝나는 날이 시작일보다 빠릅니다.",
    path: ["endDate"],
  });

const participantBodySchema = z.object({
  // '대기' 는 주최자가 직접 줄 일이 없다 — 확정하거나 거절(취소)한다
  status: z.enum(["확정", "취소"]),
});

const userParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
});

/**
 * 투어를 열 수 있는 등급.
 *
 * 활동 등급(새싹~고래)은 글·댓글 수라 다이빙을 가르칠 자격과 상관이 없다.
 * 강사는 운영진이 자격을 확인하고 부여한다 (lib/levels.ts 의 MANUAL_LEVELS).
 */
const canCreate = (level: MemberLevel) => level === "강사" || level === "운영진";

const forbidden = (reply: FastifyReply, message: string) => reply.code(403).send({ message });

/**
 * 주최자를 붙인다.
 *
 * 투어마다 따로 조회하면 목록 길이만큼 쿼리가 나간다(N+1). 한 번에 읽어 묶는다.
 * (이전에는 Promise 를 그대로 넣어 host 가 항상 빈 객체로 나갔다 — await 누락)
 */
async function withHosts(tours: Tour[]) {
  const hosts = await findPublicUsersByIds(tours.map((t) => t.hostId));
  return tours.map((t) => ({ ...t, host: hosts.get(t.hostId) ?? null }));
}

export const tourRoutes: FastifyPluginAsync = async (app) => {
  app.get("/tours", async (req) => withHosts(await listTours(tourQuerySchema.parse(req.query))));

  /** 내가 신청한 투어 — /tours/:id 보다 먼저 둬야 "me" 가 id 로 잡히지 않는다 */
  app.get("/me/tours", { onRequest: app.requireAuth }, async (req) =>
    withHosts(await listMyTours(req.user.id)),
  );

  app.get("/tours/:id", async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const tour = await findTourById(id);
    if (!tour) return notFound(reply, "투어를 찾을 수 없습니다.");

    const [withHost] = await withHosts([tour]);
    // 로그인한 사람에게만 내 신청 상태를 알려준다 (버튼 모양이 달라진다)
    const mine = req.authUser ? await findParticipant(id, req.authUser.id) : undefined;
    return { ...withHost, myStatus: mine?.status ?? null };
  });

  app.get("/tours/:id/participants", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const tour = await findTourById(id);
    if (!tour) return notFound(reply, "투어를 찾을 수 없습니다.");

    const list = await listParticipants(id);
    const users = await findPublicUsersByIds(list.map((p) => p.userId));
    return list.map((p) => ({ ...p, user: users.get(p.userId) ?? null }));
  });

  app.post("/tours", { onRequest: app.requireAuth }, async (req, reply) => {
    if (!canCreate(req.user.level)) {
      return forbidden(reply, "투어는 강사 등급부터 열 수 있습니다.");
    }
    const body = tourBodySchema.parse(req.body);
    const id = await createTour(req.user.id, body);
    const tour = await findTourById(id);
    return reply.code(201).send((await withHosts([tour!]))[0]);
  });

  app.patch("/tours/:id", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const tour = await findTourById(id);
    if (!tour) return notFound(reply, "투어를 찾을 수 없습니다.");
    if (tour.hostId !== req.user.id && req.user.level !== "운영진") {
      return forbidden(reply, "주최자만 고칠 수 있습니다.");
    }
    await updateTour(id, tourBodySchema.parse(req.body));
    return (await withHosts([(await findTourById(id))!]))[0];
  });

  app.delete("/tours/:id", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const tour = await findTourById(id);
    if (!tour) return notFound(reply, "투어를 찾을 수 없습니다.");
    if (tour.hostId !== req.user.id && req.user.level !== "운영진") {
      return forbidden(reply, "주최자만 지울 수 있습니다.");
    }
    await deleteTour(id);
    return reply.code(204).send();
  });

  app.post("/tours/:id/join", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const out = await joinTour(id, req.user.id);
    if (!out.ok) {
      if (out.reason === "없음") return notFound(reply, "투어를 찾을 수 없습니다.");
      const message =
        out.reason === "주최자"
          ? "주최자는 신청하지 않아도 됩니다."
          : out.reason === "지난투어"
            ? "이미 끝난 투어입니다."
            : "이미 신청한 투어입니다.";
      return reply.code(409).send({ message });
    }
    return { status: out.status };
  });

  app.delete("/tours/:id/join", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const ok = await leaveTour(id, req.user.id);
    if (!ok) return notFound(reply, "신청 내역이 없습니다.");
    return reply.code(204).send();
  });

  app.patch(
    "/tours/:id/participants/:userId",
    { onRequest: app.requireAuth },
    async (req, reply) => {
      const { id, userId } = userParamSchema.parse(req.params);
      const tour = await findTourById(id);
      if (!tour) return notFound(reply, "투어를 찾을 수 없습니다.");
      if (tour.hostId !== req.user.id && req.user.level !== "운영진") {
        return forbidden(reply, "주최자만 참가자를 정할 수 있습니다.");
      }

      const { status } = participantBodySchema.parse(req.body);
      const out = await setParticipantStatus(id, userId, status);
      if (!out.ok) {
        if (out.reason === "없음") return notFound(reply, "신청 내역이 없습니다.");
        return reply.code(409).send({ message: "정원이 다 찼습니다." });
      }
      return { status };
    },
  );
};
