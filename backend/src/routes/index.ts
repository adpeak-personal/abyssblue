import type { FastifyPluginAsync } from "fastify";
import { adminRoutes } from "./admin.js";
import { authRoutes } from "./auth.js";
import { oauthRoutes } from "./oauth.js";
import { memberRoutes } from "./members.js";
import { boardRoutes } from "./boards.js";
import { cafeRoutes } from "./cafe.js";
import { healthRoutes } from "./health.js";
import { logRoutes } from "./logs.js";
import { pointRoutes } from "./points.js";
import { postRoutes } from "./posts.js";
import { tourRoutes } from "./tours.js";
import { uploadRoutes } from "./uploads.js";
import { userRoutes } from "./users.js";

/** 모든 API 라우트 — app.ts 에서 prefix "/api" 로 등록 */
export const apiRoutes: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes);
  await app.register(cafeRoutes);
  await app.register(boardRoutes);
  await app.register(postRoutes);
  await app.register(pointRoutes);
  await app.register(logRoutes);
  await app.register(tourRoutes);
  await app.register(userRoutes);
  await app.register(authRoutes);
  await app.register(oauthRoutes);
  await app.register(memberRoutes);
  await app.register(uploadRoutes);
  await app.register(adminRoutes);
};
