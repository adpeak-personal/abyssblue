import type { JSONContent } from "@tiptap/core";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  InvalidContentError,
  collectImages,
  normalizeImages,
  renderContent,
  withAbsoluteImages,
} from "../lib/editor.js";
import { idParamSchema, notFound } from "../lib/http.js";
import { publicUrl, toKey } from "../lib/storage.js";
import { ensureThumbnail } from "../lib/thumbnail.js";
import { findBoardBySlug } from "../repositories/boards.js";
import {
  createComment,
  createPost,
  findCommentById,
  findPostById,
  getActivitySummary,
  increaseViews,
  listCommentsByPost,
  listNotices,
  listPopularPosts,
  listPostsByAuthor,
  softDeleteComment,
  softDeletePost,
  updateComment,
  updatePost,
  type PostPatch,
} from "../repositories/posts.js";
import {
  getMyLikedCommentIds,
  getMyPostReaction,
  listScrappedPosts,
  toggleCommentLike,
  togglePostLike,
  togglePostScrap,
} from "../repositories/reactions.js";
import { notify } from "../repositories/notifications.js";
import { refreshLevel } from "../repositories/levels.js";
import {
  linkUploadsToPost,
  relinkUploadsToPost,
  unlinkUploadsOfPost,
} from "../repositories/uploads.js";
import type { Post } from "../types.js";

/**
 * 응답용 가공.
 *
 * 작성자는 저장소가 JOIN 으로 이미 붙여 준다(N+1 방지). 여기서는 썸네일만 손본다 —
 * DB 에는 경로만 저장돼 있어서 전체 URL 로 조립해야 하고,
 * 목록에는 작은 파생본을 써야 갤러리가 무거워지지 않는다.
 */
export function forResponse<T extends { thumbnailUrl?: string }>(item: T): T {
  if (!item.thumbnailUrl) return item;
  // 저장된 값이 곧 실제로 있는 파일이다 — 여기서 썸네일 규칙으로 바꾸지 않는다
  return { ...item, thumbnailUrl: publicUrl(toKey(item.thumbnailUrl)) };
}

/** ProseMirror 문서 — 구조 검증은 Tiptap 스키마가 한다 (renderContent) */
const docSchema = z.object({ type: z.literal("doc") }).loose();

const createPostSchema = z.object({
  boardSlug: z.string().min(1),
  category: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(200),
  /** 에디터로 쓴 본문(정본). 없으면 content(평문) 로 받는다 */
  contentJson: docSchema.optional(),
  content: z.string().max(50000).default(""),
  hasImage: z.boolean().optional(),
  /** 운영진만 켤 수 있다 — 아래에서 등급을 확인한다 */
  isNotice: z.boolean().optional(),
  thumbColor: z.string().optional(),
  price: z.number().int().min(0).optional(),
  tradeStatus: z.enum(["판매중", "예약중", "판매완료"]).optional(),
});

/** 글 수정 — 게시판 이동은 허용하지 않는다(목록·권한 규칙이 게시판에 걸려 있다) */
const updatePostSchema = z.object({
  category: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  contentJson: docSchema.optional(),
  content: z.string().max(50000).optional(),
  price: z.number().int().min(0).nullable().optional(),
  tradeStatus: z.enum(["판매중", "예약중", "판매완료"]).nullable().optional(),
});

const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  parentId: z.number().int().positive().optional(),
});

const myListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(20),
});

const scrapQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(20),
});

const popularQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

type Derived = Pick<
  Post,
  "content" | "contentJson" | "contentHtml" | "thumbnailUrl" | "imageCount" | "hasImage"
>;

class EmptyContentError extends Error {}

/**
 * 리치 본문에서 저장할 값들을 만든다.
 *
 * 클라이언트가 보낸 HTML 은 믿지 않는다 — JSON 만 받아 서버가 직접 만들고 살균한다.
 * 작성과 수정이 같은 규칙을 쓰도록 한 곳에 모아 둔다.
 */
function deriveContent(contentJson: JSONContent): { derived: Derived; images: string[] } {
  // 클라이언트가 보낸 CDN 절대주소를 경로로 되돌린 뒤 저장한다
  const doc = normalizeImages(contentJson);
  const { html, text } = renderContent(doc);
  const images = collectImages(doc);
  if (!text && images.length === 0) throw new EmptyContentError();

  return {
    images,
    derived: {
      content: text,
      contentJson: doc,
      contentHtml: html,
      thumbnailUrl: images[0],
      imageCount: images.length || undefined,
      hasImage: images.length > 0 || undefined,
    },
  };
}

/** 본문 파생 중 발생한 오류를 응답으로 바꾼다. 처리했으면 true */
function replyContentError(reply: FastifyReply, err: unknown): boolean {
  if (err instanceof EmptyContentError) {
    reply.code(400).send({ message: "본문을 입력해 주세요." });
    return true;
  }
  if (err instanceof InvalidContentError) {
    reply.code(400).send({ message: err.message });
    return true;
  }
  return false;
}

/** 본인 또는 운영진인지 */
const canEdit = (user: { id: number; level: string }, authorId: number) =>
  user.id === authorId || user.level === "운영진";

/** 댓글/답글 알림 — 글쓴이와, 답글이면 원 댓글 작성자에게 */
async function sendCommentNotices(
  post: { id: number; authorId: number; title: string; boardSlug: string },
  commentId: number,
  actorId: number,
  parentId: number | undefined,
  req: FastifyRequest,
) {
  const link = `/board/${post.boardSlug}/${post.id}#comment-${commentId}`;
  const nickname = req.authUser!.nickname;

  try {
    await notify({
      userId: post.authorId,
      actorId,
      type: "댓글",
      message: `${nickname}님이 회원님의 글에 댓글을 남겼습니다: ${post.title}`,
      link,
    });

    if (parentId) {
      const parent = await findCommentById(parentId);
      // 글쓴이에게 두 번 가지 않게 (자기 글에 달린 자기 댓글의 답글)
      if (parent && parent.authorId !== post.authorId) {
        await notify({
          userId: parent.authorId,
          actorId,
          type: "답글",
          message: `${nickname}님이 회원님의 댓글에 답글을 남겼습니다.`,
          link,
        });
      }
    }
  } catch (err) {
    req.log.warn({ err }, "알림 저장 실패");
  }
}

/** 글·댓글을 쓴 뒤 등급이 올라갈 조건이 됐는지 확인하고, 올라갔으면 알린다 */
async function announcePromotion(userId: number, req: FastifyRequest) {
  try {
    const promotion = await refreshLevel(userId);
    if (!promotion) return;
    await notify({
      userId,
      type: "운영",
      message: `축하합니다! 등급이 ${promotion.to} 로 올라갔어요.`,
      link: "/mypage",
    });
  } catch (err) {
    req.log.warn({ err }, "등급 갱신 실패");
  }
}

export const postRoutes: FastifyPluginAsync = async (app) => {
  // 인기글: likes + views 기준 상위
  app.get("/posts/popular", async (req) => {
    const { limit } = popularQuerySchema.parse(req.query);
    return (await listPopularPosts(limit)).map(forResponse);
  });

  /**
   * 상단 고정용 공지.
   *
   * ":id" 보다 먼저 선언해야 한다 — 그렇지 않으면 "notices" 가 id 로 해석된다.
   */
  app.get("/posts/notices", async (req) => {
    const { limit } = popularQuerySchema.parse(req.query);
    return (await listNotices(limit)).map(forResponse);
  });

  app.get("/posts/:id", async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const post = await findPostById(id);
    if (!post) return notFound(reply, "게시글을 찾을 수 없습니다.");

    // 조회수 +1. 자기 글은 세지 않는다 — 글쓴이가 새로고침할 때마다 오르면 숫자가 의미 없다.
    // await 하지 않는다: 집계 실패가 본문 조회를 막을 이유가 없다.
    const me = req.authUser;
    if (me?.id !== post.authorId) {
      void increaseViews(id).catch((err) => req.log.warn({ err }, "조회수 증가 실패"));
    }

    const comments = await listCommentsByPost(id);
    if (!me) return { ...forResponse(post), comments, liked: false, scrapped: false };

    // 로그인했으면 "내가 누른 것" 을 함께 내려준다 — 화면이 다시 물어볼 필요가 없게
    const [reaction, likedComments] = await Promise.all([
      getMyPostReaction(id, me.id),
      getMyLikedCommentIds(id, me.id),
    ]);
    const likedSet = new Set(likedComments);
    return {
      ...forResponse(post),
      ...reaction,
      comments: comments.map((c) => ({ ...c, liked: likedSet.has(c.id) })),
    };
  });

  /** 내가 쓴 글 */
  app.get("/me/posts", { onRequest: app.requireAuth }, async (req) => {
    const { page, size } = myListQuerySchema.parse(req.query);
    const paged = await listPostsByAuthor(req.authUser!.id, page, size);
    return { ...paged, items: paged.items.map(forResponse) };
  });

  /** 마이페이지 상단 활동 요약 */
  app.get("/me/summary", { onRequest: app.requireAuth }, async (req) =>
    getActivitySummary(req.authUser!.id),
  );

  /** 내 스크랩 목록 — 본인 것만 본다 */
  app.get("/me/scraps", { onRequest: app.requireAuth }, async (req) => {
    const { page, size } = scrapQuerySchema.parse(req.query);
    const paged = await listScrappedPosts(req.authUser!.id, page, size);
    return { ...paged, items: paged.items.map(forResponse) };
  });

  /**
   * 좋아요 · 스크랩 토글.
   *
   * "켜라/꺼라" 가 아니라 토글인 이유 — 화면이 들고 있는 상태와 서버가 어긋나도
   * 한 번 더 누르면 맞춰진다. 결과로 현재 상태와 개수를 함께 돌려준다.
   */
  app.post("/posts/:id/like", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    if (!(await findPostById(id))) return notFound(reply, "게시글을 찾을 수 없습니다.");
    const { on, count } = await togglePostLike(id, req.authUser!.id);

    // 누를 때만 알린다 — 껐다 켰다 할 때마다 알림이 쌓이면 안 된다
    if (on) {
      const post = await findPostById(id);
      if (post) {
        void notify({
          userId: post.authorId,
          actorId: req.authUser!.id,
          type: "좋아요",
          message: `${req.authUser!.nickname}님이 회원님의 글을 좋아합니다: ${post.title}`,
          link: `/board/${post.boardSlug}/${post.id}`,
        }).catch((err) => req.log.warn({ err }, "알림 저장 실패"));
      }
    }
    return { liked: on, likes: count };
  });

  app.post("/posts/:id/scrap", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    if (!(await findPostById(id))) return notFound(reply, "게시글을 찾을 수 없습니다.");
    const { on } = await togglePostScrap(id, req.authUser!.id);
    return { scrapped: on };
  });

  app.post("/comments/:id/like", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const comment = await findCommentById(id);
    if (!comment) return notFound(reply, "댓글을 찾을 수 없습니다.");
    const { on, count } = await toggleCommentLike(id, req.authUser!.id);
    return { liked: on, likes: count };
  });

  // 작성자는 토큰에서 꺼낸다 — 본문으로 받으면 아무나 남의 이름으로 쓸 수 있다
  app.post("/posts", { onRequest: app.requireAuth }, async (req, reply) => {
    const authorId = req.authUser!.id;
    const body = createPostSchema.parse(req.body);
    const board = await findBoardBySlug(body.boardSlug);
    if (!board) return notFound(reply, "게시판을 찾을 수 없습니다.");
    if (body.category && board.categories && !board.categories.includes(body.category)) {
      return reply.code(400).send({ message: `유효하지 않은 말머리입니다: ${body.category}` });
    }

    let derived: Derived = { content: body.content };
    let usedImages: string[] = [];
    if (body.contentJson) {
      try {
        const out = deriveContent(body.contentJson as JSONContent);
        derived = out.derived;
        usedImages = out.images;
      } catch (err) {
        if (replyContentError(reply, err)) return;
        throw err;
      }
    }

    // 목록 썸네일은 첫 이미지 하나만 만든다. 만들고 나서 저장해야
    // 저장된 경로가 실제로 있는 파일을 가리킨다
    if (derived.thumbnailUrl) derived.thumbnailUrl = await ensureThumbnail(derived.thumbnailUrl);

    const { contentJson: _ignored, isNotice, ...rest } = body;
    // 공지는 운영진만 올릴 수 있다. 일반 회원이 보내도 조용히 무시한다
    const notice = isNotice === true && req.authUser!.level === "운영진";
    const post = await createPost({ ...rest, isNotice: notice, authorId, ...derived });

    // 본문에 실제로 쓰인 이미지만 이 글에 묶는다 — 나머지는 청소 대상으로 남는다
    if (usedImages.length) await linkUploadsToPost(post.id, usedImages);

    void announcePromotion(authorId, req);
    return reply.code(201).send(forResponse(post));
  });

  /**
   * 수정 화면이 쓸 원본.
   *
   * 상세 조회와 다른 점 — 저장된 정본(JSON)을 그대로 주되 이미지 경로만 전체 URL 로
   * 바꿔 준다. 에디터가 미리보기를 띄울 수 있어야 하기 때문이다.
   */
  app.get("/posts/:id/edit", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const post = await findPostById(id);
    if (!post) return notFound(reply, "게시글을 찾을 수 없습니다.");
    if (!canEdit(req.authUser!, post.authorId)) {
      return reply.code(403).send({ message: "수정 권한이 없습니다." });
    }

    const board = await findBoardBySlug(post.boardSlug);
    return {
      id: post.id,
      boardSlug: post.boardSlug,
      writeMode: board?.writeMode ?? "editor",
      category: post.category ?? null,
      title: post.title,
      content: post.content,
      contentJson: post.contentJson
        ? withAbsoluteImages(post.contentJson as JSONContent)
        : null,
      price: post.price ?? null,
      tradeStatus: post.tradeStatus ?? null,
    };
  });

  app.patch("/posts/:id", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const post = await findPostById(id);
    if (!post) return notFound(reply, "게시글을 찾을 수 없습니다.");
    if (!canEdit(req.authUser!, post.authorId)) {
      return reply.code(403).send({ message: "수정 권한이 없습니다." });
    }

    const body = updatePostSchema.parse(req.body);
    const board = await findBoardBySlug(post.boardSlug);
    if (body.category && board?.categories && !board.categories.includes(body.category)) {
      return reply.code(400).send({ message: `유효하지 않은 말머리입니다: ${body.category}` });
    }

    const { contentJson, content, ...fields } = body;
    const patch: PostPatch = { ...fields };
    let usedImages: string[] | undefined;

    if (contentJson) {
      try {
        const out = deriveContent(contentJson as JSONContent);
        // 작성과 달리 여기서는 빈 값을 null 로 명시해야 한다 —
        // undefined 는 "안 건드림" 이라서, 이미지를 모두 뺀 수정에서 옛 썸네일이 남는다
        patch.content = out.derived.content;
        patch.contentJson = out.derived.contentJson;
        patch.contentHtml = out.derived.contentHtml ?? null;
        // 첫 이미지가 바뀌었을 수 있다 — 새 첫 이미지의 썸네일을 준비한다
        patch.thumbnailUrl = out.derived.thumbnailUrl
          ? await ensureThumbnail(out.derived.thumbnailUrl)
          : null;
        patch.imageCount = out.images.length;
        patch.hasImage = out.images.length > 0;
        usedImages = out.images;
      } catch (err) {
        if (replyContentError(reply, err)) return;
        throw err;
      }
    } else if (content !== undefined) {
      // 평문 게시판 — 본문만 갈아끼운다
      patch.content = content;
    }

    const updated = await updatePost(id, patch);
    if (!updated) return notFound(reply, "게시글을 찾을 수 없습니다.");

    // 본문에서 빠진 이미지는 연결을 끊어 청소 대상으로 돌린다.
    // 본문을 안 건드린 수정(말머리만 변경 등)이면 그대로 둬야 한다.
    if (usedImages) await relinkUploadsToPost(id, usedImages);



    return forResponse(updated);
  });

  app.delete("/posts/:id", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const post = await findPostById(id);
    if (!post) return notFound(reply, "게시글을 찾을 수 없습니다.");
    if (!canEdit(req.authUser!, post.authorId)) {
      return reply.code(403).send({ message: "삭제 권한이 없습니다." });
    }

    await softDeletePost(id);
    // 글이 사라졌으니 이미지도 청소 대상으로. 파일 삭제는 uploads:gc 가 유예 후 처리한다
    await unlinkUploadsOfPost(id);
    return reply.code(204).send();
  });

  app.post("/posts/:id/comments", { onRequest: app.requireAuth }, async (req, reply) => {
    const authorId = req.authUser!.id;
    const { id } = idParamSchema.parse(req.params);
    const post = await findPostById(id);
    if (!post) return notFound(reply, "게시글을 찾을 수 없습니다.");
    const body = createCommentSchema.parse(req.body);
    if (body.parentId !== undefined) {
      const parent = await findCommentById(body.parentId);
      if (!parent || parent.postId !== id) return notFound(reply, "상위 댓글을 찾을 수 없습니다.");
    }
    const comment = await createComment({ postId: id, authorId, ...body });

    // 알림은 부수적인 일이다 — 실패해도 댓글 작성은 성공으로 끝나야 한다
    void sendCommentNotices(post, comment.id, authorId, body.parentId, req);
    void announcePromotion(authorId, req);

    return reply.code(201).send(comment);
  });

  app.patch("/comments/:id", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const comment = await findCommentById(id);
    if (!comment) return notFound(reply, "댓글을 찾을 수 없습니다.");
    if (!canEdit(req.authUser!, comment.authorId)) {
      return reply.code(403).send({ message: "수정 권한이 없습니다." });
    }
    const { content } = createCommentSchema.pick({ content: true }).parse(req.body);
    const updated = await updateComment(id, content);
    if (!updated) return notFound(reply, "댓글을 찾을 수 없습니다.");
    return updated;
  });

  app.delete("/comments/:id", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const comment = await findCommentById(id);
    if (!comment) return notFound(reply, "댓글을 찾을 수 없습니다.");
    if (!canEdit(req.authUser!, comment.authorId)) {
      return reply.code(403).send({ message: "삭제 권한이 없습니다." });
    }
    await softDeleteComment(id, comment.postId);
    return reply.code(204).send();
  });
};
