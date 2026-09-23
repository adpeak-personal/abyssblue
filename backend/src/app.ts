import cors from "@fastify/cors";
import Fastify, { type FastifyServerOptions } from "fastify";
import { ZodError } from "zod";
import { apiRoutes } from "./routes/index.js";

export interface AppOptions {
  corsOrigin?: string | string[];
  logger?: FastifyServerOptions["logger"];
}

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });

  await app.register(cors, {
    origin: options.corsOrigin ?? "http://localhost:3000",
    credentials: true,
  });

  // 검증 오류 → 400, 그 외 → 상태코드 유지 / 500
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        message: "요청 값이 올바르지 않습니다.",
        issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    const err = error as { statusCode?: number; message?: string };
    const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (statusCode >= 500) req.log.error(error);
    return reply.code(statusCode).send({
      message: statusCode >= 500 ? "서버 오류가 발생했습니다." : (err.message ?? "요청을 처리할 수 없습니다."),
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ message: `경로를 찾을 수 없습니다: ${req.method} ${req.url}` });
  });

  await app.register(apiRoutes, { prefix: "/api" });

  return app;
}
