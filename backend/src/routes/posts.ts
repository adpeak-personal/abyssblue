import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { idParamSchema, notFound } from "../lib/http.js";
import { findBoardBySlug } from "../repositories/boards.js";
import {
  createComment,
  createPost,
  findCommentById,
  findPostById,
  listCommentsByPost,
  listPopularPosts,
} from "../repositories/posts.js";
import { findPublicUserById, findUserById } from "../repositories/users.js";
import type { Comment, Post } from "../types.js";

/** 게시글/댓글에 공개 작성자 정보(이메일 제외) 부착 */
export const withAuthor = <T extends Post | Comment>(item: T) => ({
  ...item,
  author: findPublicUserById(item.authorId),
});

const createPostSchema = z.object({
  boardSlug: z.string().min(1),
  category: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(200),
  content: z.string().max(20000).default(""),
  // TODO: bcrypt + JWT + MySQL — 인증 도입 후 authorId 는 토큰에서 추출
  authorId: z.number().int().positive(),
  hasImage: z.boolean().optional(),
  thumbColor: z.string().optional(),
  price: z.number().int().min(0).optional(),
  tradeStatus: z.enum(["판매중", "예약중", "판매완료"]).optional(),
});

const createCommentSchema = z.object({
  // TODO: bcrypt + JWT + MySQL — 인증 도입 후 authorId 는 토큰에서 추출
  authorId: z.number().int().positive(),
  content: z.string().trim().min(1).max(2000),
  parentId: z.number().int().positive().optional(),
});

const popularQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const postRoutes: FastifyPluginAsync = async (app) => {
  // 인기글: likes + views 기준 상위
  app.get("/posts/popular", async (req) => {
    const { limit } = popularQuerySchema.parse(req.query);
    return listPopularPosts(limit).map(withAuthor);
  });

  app.get("/posts/:id", async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const post = findPostById(id);
    if (!post) return notFound(reply, "게시글을 찾을 수 없습니다.");
    return { ...withAuthor(post), comments: listCommentsByPost(id).map(withAuthor) };
  });

  app.post("/posts", async (req, reply) => {
    const body = createPostSchema.parse(req.body);
    const board = findBoardBySlug(body.boardSlug);
    if (!board) return notFound(reply, "게시판을 찾을 수 없습니다.");
    if (!findUserById(body.authorId)) return notFound(reply, "작성자를 찾을 수 없습니다.");
    if (body.category && board.categories && !board.categories.includes(body.category)) {
      return reply.code(400).send({ message: `유효하지 않은 말머리입니다: ${body.category}` });
    }
    const post = createPost(body);
    return reply.code(201).send(withAuthor(post));
  });

  app.post("/posts/:id/comments", async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    if (!findPostById(id)) return notFound(reply, "게시글을 찾을 수 없습니다.");
    const body = createCommentSchema.parse(req.body);
    if (!findUserById(body.authorId)) return notFound(reply, "작성자를 찾을 수 없습니다.");
    if (body.parentId !== undefined) {
      const parent = findCommentById(body.parentId);
      if (!parent || parent.postId !== id) return notFound(reply, "상위 댓글을 찾을 수 없습니다.");
    }
    const comment = createComment({ postId: id, ...body });
    return reply.code(201).send(withAuthor(comment));
  });
};
