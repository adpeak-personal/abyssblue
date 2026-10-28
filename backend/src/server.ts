import "dotenv/config";
import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? 5030);
const host = process.env.HOST ?? "0.0.0.0";
const corsOrigin = (process.env.CORS_ORIGIN ?? "http://localhost:5000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const app = await buildApp({ corsOrigin });

const shutdown = async (signal: string) => {
  app.log.info(`${signal} 수신 — 서버 종료`);
  await app.close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
