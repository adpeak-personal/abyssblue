import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { idParamSchema, notFound, optionalQuery } from "../lib/http.js";
import { findTourById, listTours } from "../repositories/tours.js";
import { findPublicUsersByIds } from "../repositories/users.js";
import type { Tour } from "../types.js";

const tourQuerySchema = z.object({
  type: optionalQuery(z.enum(["번개", "정기투어", "해외투어", "교육"])),
  status: optionalQuery(z.enum(["모집중", "마감임박", "마감"])),
});

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

  app.get("/tours/:id", async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const tour = await findTourById(id);
    if (!tour) return notFound(reply, "투어를 찾을 수 없습니다.");
    return (await withHosts([tour]))[0];
  });
};
