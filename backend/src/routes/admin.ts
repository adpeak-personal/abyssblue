import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getStorage } from "../lib/storage.js";
import { notFound } from "../lib/http.js";
import { findBoardBySlug, listBoardGroups, updateBoard } from "../repositories/boards.js";
import { query, queryOne } from "../db/pool.js";
import { AUTHOR_COLUMNS, toAuthor, toIso } from "../repositories/rows.js";
import type { RowDataPacket } from "mysql2";
import type { AuthorCols } from "../repositories/rows.js";

interface TotalsRow extends RowDataPacket {
  users: number;
  posts: number;
  comments: number;
  boards: number;
}

interface RecentRow extends RowDataPacket {
  posts: number;
  comments: number;
  users: number;
}

interface BoardCountRow extends RowDataPacket {
  slug: string;
  name: string;
  type: string;
  post_count: number;
}

interface RecentPostRow extends RowDataPacket, AuthorCols {
  id: number;
  title: string;
  created_at: string;
  comment_count: number;
  board_slug: string;
}

type AuthorRow = RowDataPacket & AuthorCols;

// 이 플러그인의 모든 라우트는 운영진 전용이다.

const boardPatchSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  description: z.string().trim().max(200).optional(),
  type: z.enum(["list", "gallery", "qna"]).optional(),
  writeMode: z.enum(["editor", "photo"]).optional(),
  highQuality: z.boolean().optional(),
  // 빈 배열이면 말머리 없는 게시판
  categories: z.array(z.string().trim().min(1).max(20)).max(20).optional(),
});

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // 라우트마다 거는 대신 플러그인 전체에 건다 — 새 라우트를 추가할 때 빠뜨리지 않도록
  app.addHook("onRequest", app.requireAdmin);

  /** 대시보드 지표 — 집계는 전부 SQL 로 (전체 행을 끌어와 세지 않는다) */
  app.get("/admin/stats", async () => {
    // 로컬/S3 어느 쪽이든 현재 저장소에서 센다
    const uploads = await getStorage().usage();

    const totals = await queryOne<TotalsRow>(`
      SELECT (SELECT COUNT(*) FROM users)    AS users,
             (SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL)    AS posts,
             (SELECT COUNT(*) FROM comments WHERE deleted_at IS NULL) AS comments,
             (SELECT COUNT(*) FROM boards)   AS boards`);

    const recent = await queryOne<RecentRow>(`
      SELECT (SELECT COUNT(*) FROM posts    WHERE created_at >= NOW() - INTERVAL 7 DAY) AS posts,
             (SELECT COUNT(*) FROM comments WHERE created_at >= NOW() - INTERVAL 7 DAY) AS comments,
             (SELECT COUNT(*) FROM users    WHERE joined_at  >= CURDATE() - INTERVAL 7 DAY) AS users`);

    const byBoard = await query<BoardCountRow>(`
      SELECT b.slug, b.name, b.type, COUNT(p.id) AS post_count
        FROM boards b
        LEFT JOIN posts p ON p.board_id = b.id AND p.deleted_at IS NULL
       GROUP BY b.id, b.slug, b.name, b.type
       ORDER BY post_count DESC, b.id`);

    const recentPosts = await query<RecentPostRow>(`
      SELECT p.id, p.title, p.created_at, p.comment_count, b.slug AS board_slug, ${AUTHOR_COLUMNS}
        FROM posts p
        JOIN boards b ON b.id = p.board_id
        LEFT JOIN users u ON u.id = p.author_id
       WHERE p.deleted_at IS NULL
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT 6`);

    const recentUsers = await query<AuthorRow>(`
      SELECT ${AUTHOR_COLUMNS} FROM users u ORDER BY u.joined_at DESC, u.id DESC LIMIT 6`);

    return {
      totals: {
        users: Number(totals?.users ?? 0),
        posts: Number(totals?.posts ?? 0),
        comments: Number(totals?.comments ?? 0),
        boards: Number(totals?.boards ?? 0),
        uploadFiles: uploads.files,
        uploadBytes: uploads.bytes,
      },
      recent7d: {
        posts: Number(recent?.posts ?? 0),
        comments: Number(recent?.comments ?? 0),
        users: Number(recent?.users ?? 0),
      },
      byBoard: byBoard.map((b) => ({
        slug: b.slug,
        name: b.name,
        type: b.type,
        postCount: Number(b.post_count),
      })),
      recentPosts: recentPosts.map((r) => ({
        id: r.id,
        boardSlug: r.board_slug,
        title: r.title,
        createdAt: toIso(r.created_at),
        commentCount: Number(r.comment_count),
        author: toAuthor(r),
      })),
      recentUsers: recentUsers.map(toAuthor),
    };
  });

  /** 게시판 설정 목록 — 그룹 구조 그대로 + 글 수 */
  app.get("/admin/boards", async () => {
    const groups = await listBoardGroups();
    const counts = await query<BoardCountRow>(`
      SELECT b.slug, COUNT(p.id) AS post_count
        FROM boards b
        LEFT JOIN posts p ON p.board_id = b.id AND p.deleted_at IS NULL
       GROUP BY b.id, b.slug`);
    const countBySlug = new Map(counts.map((c) => [c.slug, Number(c.post_count)]));

    return groups.map((g) => ({
      ...g,
      boards: g.boards.map((b) => ({ ...b, postCount: countBySlug.get(b.slug) ?? 0 })),
    }));
  });

  /** 게시판 설정 수정 */
  app.patch("/admin/boards/:slug", async (req, reply) => {
    const { slug } = z.object({ slug: z.string().min(1) }).parse(req.params);
    if (!(await findBoardBySlug(slug))) return notFound(reply, "게시판을 찾을 수 없습니다.");

    const patch = boardPatchSchema.parse(req.body);
    if (Object.keys(patch).length === 0) {
      return reply.code(400).send({ message: "변경할 내용이 없습니다." });
    }

    // 말머리 중복 제거 — 빈 배열은 "말머리 없음" 으로 저장
    if (patch.categories) {
      const unique = [...new Set(patch.categories)];
      return updateBoard(slug, { ...patch, categories: unique.length ? unique : undefined });
    }
    return updateBoard(slug, patch);
  });
};
