import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { notFound, optionalQuery } from "../lib/http.js";
import { findBoardBySlug, listBoardGroups } from "../repositories/boards.js";
import { SEARCH_SCOPES, listPostsByBoard, type SearchScope } from "../repositories/posts.js";
import { forResponse } from "./posts.js";

const slugParamSchema = z.object({ slug: z.string().min(1) });

const postListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  category: optionalQuery(z.string()),
  q: optionalQuery(z.string()),
  /** 검색 범위 — 모르는 값이 오면 기본(제목+본문)으로 떨어진다 */
  scope: optionalQuery(z.enum(SEARCH_SCOPES as [SearchScope, ...SearchScope[]])),
});

export const boardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/boards", async () => listBoardGroups());

  app.get("/boards/:slug", async (req, reply) => {
    const { slug } = slugParamSchema.parse(req.params);
    const board = await findBoardBySlug(slug);
    if (!board) return notFound(reply, "게시판을 찾을 수 없습니다.");
    return board;
  });

  // 전체글보기 — 게시판 구분 없이 최신순
  app.get("/posts", async (req) => {
    const query = postListQuerySchema.parse(req.query);
    const result = await listPostsByBoard(query);
    return { ...result, items: result.items.map(forResponse) };
  });

  app.get("/boards/:slug/posts", async (req, reply) => {
    const { slug } = slugParamSchema.parse(req.params);
    if (!(await findBoardBySlug(slug))) return notFound(reply, "게시판을 찾을 수 없습니다.");
    const query = postListQuerySchema.parse(req.query);
    const result = await listPostsByBoard({ boardSlug: slug, ...query });
    return { ...result, items: result.items.map(forResponse) };
  });
};
