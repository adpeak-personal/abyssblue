import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({
    status: "ok",
    service: "abyssblue-backend",
    dataSource: "mock", // TODO: MySQL 연결 후 "mysql"
    time: new Date().toISOString(),
  }));
};
