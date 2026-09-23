import type { FastifyPluginAsync } from "fastify";
import { getCafeOverview } from "../repositories/cafe.js";

export const cafeRoutes: FastifyPluginAsync = async (app) => {
  // CAFE_INFO + seaConditions + popularTags
  app.get("/cafe", async () => getCafeOverview());
};
