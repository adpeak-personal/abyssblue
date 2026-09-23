// 공통 HTTP 헬퍼 — 404 응답, id 파라미터 파싱 스키마
import type { FastifyReply } from "fastify";
import { z } from "zod";

/** `:id` 경로 파라미터 (양의 정수) */
export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

/** 빈 문자열 쿼리(?region=)는 미지정으로 취급 */
export const optionalQuery = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

export function notFound(reply: FastifyReply, message: string) {
  return reply.code(404).send({ message });
}
