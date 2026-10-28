import { mkdir } from "node:fs/promises";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyServerOptions } from "fastify";
import { ZodError } from "zod";
import { LOCAL_URL_PREFIX, MAX_IMAGE_BYTES, UPLOAD_DIR, getStorage } from "./lib/storage.js";
import { authPlugin } from "./plugins/auth.js";
import { maintenancePlugin } from "./plugins/maintenance.js";
import { apiRoutes } from "./routes/index.js";

export interface AppOptions {
  corsOrigin?: string | string[];
  logger?: FastifyServerOptions["logger"];
}

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });

  await app.register(cors, {
    origin: options.corsOrigin ?? "http://localhost:5000",
    credentials: true,
  });

  // 인증 — 쿠키/Bearer 양쪽을 받고 requireAuth·requireAdmin 가드를 제공한다
  await app.register(authPlugin);

  // 에디터 이미지 업로드 (multipart) — 파일 1개, 10MB 제한
  await app.register(multipart, {
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  });

  // 로컬 저장소일 때만 파일을 직접 서빙한다.
  // S3 를 쓰면 CloudFront 가 서빙하므로 이 경로가 필요 없다.
  if (getStorage().kind === "local") {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await app.register(fastifyStatic, {
      root: UPLOAD_DIR,
      prefix: LOCAL_URL_PREFIX,
      decorateReply: false,
      index: false,
    });
  }

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

  // 고아 이미지·오래된 알림 정리 — 주기적으로 알아서 돈다
  await app.register(maintenancePlugin);

  return app;
}
