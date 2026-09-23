import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { notFound, optionalQuery } from "../lib/http.js";
import { findBoardBySlug, listBoardGroups } from "../repositories/boards.js";
import { listPostsByBoard } from "../repositories/posts.js";
import { withAuthor } from "./posts.js";

const slugParamSchema = z.object({ slug: z.string().min(1) });

const postListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  category: optionalQuery(z.string()),
  q: optionalQuery(z.string()),
});

export const boardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/boards", async () => listBoardGroups());

  app.get("/boards/:slug", async (req, reply) => {
    const { slug } = slugParamSchema.parse(req.params);
    const board = findBoardBySlug(slug);
    if (!board) return notFound(reply, "게시판을 찾을 수 없습니다.");
    return board;
  });

  app.get("/boards/:slug/posts", async (req, reply) => {
    const { slug } = slugParamSchema.parse(req.params);
    if (!findBoardBySlug(slug)) return notFound(reply, "게시판을 찾을 수 없습니다.");
    const query = postListQuerySchema.parse(req.query);
    const result = listPostsByBoard({ boardSlug: slug, ...query });
    return { ...result, items: result.items.map(withAuthor) };
  });
};
