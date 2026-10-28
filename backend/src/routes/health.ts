import type { FastifyPluginAsync } from "fastify";
import { verifyConnection } from "../db/pool.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  /**
   * 살아 있는지 + DB 에 닿는지.
   *
   * 배포가 이 응답으로 컨테이너가 제대로 떴는지 판단한다
   * (deploy/docker-compose.yml 의 healthcheck). 그래서 DB 에 못 닿으면 503 을 준다 —
   * DB 없이 떠 있는 API 는 배포가 성공한 게 아니다.
   */
  app.get("/health", async (_req, reply) => {
    const base = {
      service: "abyssblue-backend",
      dataSource: "mysql",
      time: new Date().toISOString(),
    };

    try {
      await verifyConnection();
      return { status: "ok", db: "ok", ...base };
    } catch (err) {
      // 접속 정보가 메시지에 섞여 있을 수 있어 응답에는 넣지 않는다 — 로그로만 남긴다
      app.log.error({ err }, "health: DB 에 닿지 못했습니다");
      return reply.code(503).send({ status: "degraded", db: "unreachable", ...base });
    }
  });
};
