import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { idParamSchema, notFound, optionalQuery } from "../lib/http.js";
import { findTourById, listTours } from "../repositories/tours.js";
import { findPublicUserById } from "../repositories/users.js";
import type { Tour } from "../types.js";

const tourQuerySchema = z.object({
  type: optionalQuery(z.enum(["번개", "정기투어", "해외투어", "교육"])),
  status: optionalQuery(z.enum(["모집중", "마감임박", "마감"])),
});

const withHost = (tour: Tour) => ({ ...tour, host: findPublicUserById(tour.hostId) });

export const tourRoutes: FastifyPluginAsync = async (app) => {
  app.get("/tours", async (req) => listTours(tourQuerySchema.parse(req.query)).map(withHost));

  app.get("/tours/:id", async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const tour = findTourById(id);
    if (!tour) return notFound(reply, "투어를 찾을 수 없습니다.");
    return withHost(tour);
  });
};
