// 좋아요 / 스크랩 저장소.
//
// 누가 눌렀는지를 따로 기록하는 이유 — 숫자만 올리면 한 사람이 몇 번이고 누를 수 있고,
// 다시 들어왔을 때 "내가 눌렀는지" 를 보여줄 수도 없다.
// `posts.likes` · `comments.likes` 는 이 기록 개수를 캐시한 값이라, 둘을 같은
// 트랜잭션에서 움직여야 어긋나지 않는다.
import type { RowDataPacket } from "mysql2";
import { query, queryOne, transaction } from "../db/pool.js";
import type { Post } from "../types.js";
import { AUTHOR_COLUMNS, toAuthor, toPost, type PostRow } from "./rows.js";
import type { Paged, WithAuthor } from "./posts.js";

export interface ToggleResult {
  /** 지금 눌린 상태인지 */
  on: boolean;
  /** 반영된 전체 개수 */
  count: number;
}

/**
 * 좋아요 토글 — 눌려 있으면 끄고, 아니면 켠다.
 *
 * 집계 컬럼을 같은 트랜잭션에서 올리고 내린다. 연타로 두 번 들어와도
 * PRIMARY KEY 가 중복 INSERT 를 막으므로 개수가 두 번 오르지 않는다.
 */
async function toggle(
  table: "post_likes" | "post_scraps" | "comment_likes",
  idColumn: string,
  targetId: number,
  userId: number,
  /** 집계 컬럼을 들고 있는 테이블 (스크랩은 집계를 두지 않아 없음) */
  counter?: { table: "posts" | "comments"; column: "likes" },
): Promise<ToggleResult> {
  return transaction(async (conn) => {
    const [existing] = await conn.execute(
      `SELECT 1 FROM ${table} WHERE ${idColumn} = ? AND user_id = ?`,
      [targetId, userId],
    );
    const on = (existing as RowDataPacket[]).length === 0;

    if (on) {
      await conn.execute(
        `INSERT INTO ${table} (${idColumn}, user_id) VALUES (?,?)`,
        [targetId, userId],
      );
    } else {
      await conn.execute(
        `DELETE FROM ${table} WHERE ${idColumn} = ? AND user_id = ?`,
        [targetId, userId],
      );
    }

    if (!counter) {
      const [counted] = await conn.execute(
        `SELECT COUNT(*) AS n FROM ${table} WHERE ${idColumn} = ?`,
        [targetId],
      );
      return { on, count: Number((counted as RowDataPacket[])[0]?.n ?? 0) };
    }

    // 0 밑으로 내려가지 않게 — 집계가 어긋난 적이 있어도 음수가 되면 안 된다
    await conn.execute(
      on
        ? `UPDATE ${counter.table} SET ${counter.column} = ${counter.column} + 1 WHERE id = ?`
        : `UPDATE ${counter.table} SET ${counter.column} = GREATEST(${counter.column} - 1, 0) WHERE id = ?`,
      [targetId],
    );

    // 기록 개수가 아니라 집계 컬럼 값을 돌려준다.
    // 목록·상세가 전부 이 컬럼을 보여주므로, 여기서 실제 행 수를 주면
    // 누르는 순간 숫자가 엉뚱하게 튄다.
    const [rows] = await conn.execute(
      `SELECT ${counter.column} AS n FROM ${counter.table} WHERE id = ?`,
      [targetId],
    );
    return { on, count: Number((rows as RowDataPacket[])[0]?.n ?? 0) };
  });
}

export const togglePostLike = (postId: number, userId: number) =>
  toggle("post_likes", "post_id", postId, userId, { table: "posts", column: "likes" });

export const toggleCommentLike = (commentId: number, userId: number) =>
  toggle("comment_likes", "comment_id", commentId, userId, { table: "comments", column: "likes" });

/** 스크랩은 본인만 보는 값이라 공개 집계를 두지 않는다 */
export const togglePostScrap = (postId: number, userId: number) =>
  toggle("post_scraps", "post_id", postId, userId);

export interface MyReaction {
  liked: boolean;
  scrapped: boolean;
}

/** 글 상세에서 "내가 누른 상태" — 비로그인이면 호출하지 않는다 */
export async function getMyPostReaction(postId: number, userId: number): Promise<MyReaction> {
  const row = await queryOne<RowDataPacket & { liked: number; scrapped: number }>(
    `SELECT EXISTS(SELECT 1 FROM post_likes  WHERE post_id = ? AND user_id = ?) AS liked,
            EXISTS(SELECT 1 FROM post_scraps WHERE post_id = ? AND user_id = ?) AS scrapped`,
    [postId, userId, postId, userId],
  );
  return { liked: Number(row?.liked) === 1, scrapped: Number(row?.scrapped) === 1 };
}

/**
 * 이 글의 댓글 중 내가 좋아요 누른 것들.
 *
 * 댓글마다 따로 묻지 않고 한 번에 가져온다 — 댓글 50개면 쿼리가 50번 나간다(N+1).
 */
export async function getMyLikedCommentIds(postId: number, userId: number): Promise<number[]> {
  const rows = await query<RowDataPacket & { comment_id: number }>(
    `SELECT cl.comment_id
       FROM comment_likes cl
       JOIN comments c ON c.id = cl.comment_id
      WHERE c.post_id = ? AND cl.user_id = ?`,
    [postId, userId],
  );
  return rows.map((r) => Number(r.comment_id));
}

/** 마이페이지 "내 스크랩" — 스크랩한 순서(최신)대로 */
export async function listScrappedPosts(
  userId: number,
  page: number,
  size: number,
): Promise<Paged<WithAuthor<Post>>> {
  const countRow = await queryOne<RowDataPacket & { total: number }>(
    `SELECT COUNT(*) AS total
       FROM post_scraps s JOIN posts p ON p.id = s.post_id
      WHERE s.user_id = ? AND p.deleted_at IS NULL`,
    [userId],
  );

  const offset = Math.max(0, (page - 1) * size);
  const rows = await query<PostRow>(
    `SELECT p.*, b.slug AS board_slug, b.name AS board_name, ${AUTHOR_COLUMNS}
       FROM post_scraps s
       JOIN posts p  ON p.id = s.post_id
       JOIN boards b ON b.id = p.board_id
       LEFT JOIN users u ON u.id = p.author_id
      WHERE s.user_id = ? AND p.deleted_at IS NULL
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?`,
    [userId, size, offset],
  );

  return {
    items: rows.map((r) => ({ ...toPost(r), author: toAuthor(r as never) })),
    total: Number(countRow?.total ?? 0),
    page,
    size,
  };
}
