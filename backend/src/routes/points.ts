import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { idParamSchema, notFound, optionalQuery } from "../lib/http.js";
import { findPointById, listPoints } from "../repositories/points.js";

const pointQuerySchema = z.object({
  region: optionalQuery(z.enum(["동해", "남해", "제주", "서해", "해외"])),
  difficulty: optionalQuery(z.enum(["초급", "중급", "상급"])),
  q: optionalQuery(z.string()),
});

export const pointRoutes: FastifyPluginAsync = async (app) => {
  app.get("/points", async (req) => listPoints(pointQuerySchema.parse(req.query)));

  app.get("/points/:id", async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const point = findPointById(id);
    if (!point) return notFound(reply, "다이빙 포인트를 찾을 수 없습니다.");
    return point;
  });
};
