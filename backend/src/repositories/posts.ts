// 게시글/댓글 저장소 (MySQL)
//
// 목록은 작성자를 JOIN 으로 함께 가져온다 — 글마다 따로 조회하면 15개 목록에
// 쿼리가 16번 나간다(N+1).
import { execute, query, queryOne, transaction } from "../db/pool.js";
import type { Comment, Post } from "../types.js";
import {
  AUTHOR_COLUMNS,
  toAuthor,
  toComment,
  toPost,
  type CommentRow,
  type PostRow,
} from "./rows.js";
import type { PublicUser } from "./users.js";

export type WithAuthor<T> = T & { author: PublicUser | null };

/** 검색 범위 — 기본은 제목+본문 */
export type SearchScope = "title_content" | "title" | "content" | "author";

export const SEARCH_SCOPES: SearchScope[] = ["title_content", "title", "content", "author"];

export interface PostListQuery {
  /** 없으면 전체글보기 */
  boardSlug?: string;
  page: number;
  size: number;
  category?: string;
  q?: string;
  scope?: SearchScope;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

/** 모든 조회가 같은 컬럼 집합을 쓰도록 */
const POST_SELECT = `
  SELECT p.*, b.slug AS board_slug, b.name AS board_name, ${AUTHOR_COLUMNS}
    FROM posts p
    JOIN boards b ON b.id = p.board_id
    LEFT JOIN users u ON u.id = p.author_id`;

/** LIKE 패턴에서 특수문자를 글자 그대로 취급하게 한다 */
const escapeLike = (raw: string) => raw.replace(/[\\%_]/g, (ch) => "\\" + ch);

const attach = (r: PostRow): WithAuthor<Post> => ({ ...toPost(r), author: toAuthor(r as never) });

/** 목록 조건 — 개수 세기와 본 조회가 같은 WHERE 를 쓰게 한 곳에서 만든다 */
function buildFilter(query: PostListQuery) {
  const where: string[] = ["p.deleted_at IS NULL"];
  const params: unknown[] = [];

  if (query.boardSlug) {
    where.push("b.slug = ?");
    params.push(query.boardSlug);
  } else {
    // 전체글보기 — 공지는 각 게시판 것이므로 제외
    where.push("p.is_notice = 0");
  }
  if (query.category) {
    where.push("p.category = ?");
    params.push(query.category);
  }
  if (query.q?.trim()) {
    // LIKE 특수문자를 그대로 넣으면 "%" 한 글자로 전체가 걸린다
    const like = `%${escapeLike(query.q.trim())}%`;
    switch (query.scope) {
      case "title":
        where.push("p.title LIKE ?");
        params.push(like);
        break;
      case "content":
        where.push("p.content LIKE ?");
        params.push(like);
        break;
      case "author":
        // 닉네임은 이미 JOIN 돼 있다 (목록이 작성자를 함께 가져오므로)
        where.push("u.nickname LIKE ?");
        params.push(like);
        break;
      default:
        where.push("(p.title LIKE ? OR p.content LIKE ?)");
        params.push(like, like);
    }
  }
  return { sql: where.join(" AND "), params, needsAuthorJoin: query.scope === "author" };
}

export async function listPostsByBoard(q: PostListQuery): Promise<Paged<WithAuthor<Post>>> {
  const { sql: whereSql, params, needsAuthorJoin } = buildFilter(q);

  const countRow = await queryOne<PostRow & { total: number }>(
    `SELECT COUNT(*) AS total
       FROM posts p
       JOIN boards b ON b.id = p.board_id
       ${needsAuthorJoin ? "LEFT JOIN users u ON u.id = p.author_id" : ""}
      WHERE ${whereSql}`,
    params,
  );
  const total = Number(countRow?.total ?? 0);

  // 공지 게시판에서만 공지글을 상단 고정
  const order =
    q.boardSlug === "notice"
      ? "p.is_notice DESC, p.created_at DESC, p.id DESC"
      : "p.created_at DESC, p.id DESC";

  const offset = Math.max(0, (q.page - 1) * q.size);
  const rows = await query<PostRow>(
    `${POST_SELECT} WHERE ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, q.size, offset],
  );

  return { items: rows.map(attach), total, page: q.page, size: q.size };
}

/** 내가 쓴 글 — 마이페이지용. 삭제한 글은 빼고 최신순 */
export async function listPostsByAuthor(
  authorId: number,
  page: number,
  size: number,
): Promise<Paged<WithAuthor<Post>>> {
  const countRow = await queryOne<PostRow & { total: number }>(
    "SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND deleted_at IS NULL",
    [authorId],
  );

  const offset = Math.max(0, (page - 1) * size);
  const rows = await query<PostRow>(
    `${POST_SELECT}
      WHERE p.author_id = ? AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ? OFFSET ?`,
    [authorId, size, offset],
  );

  return { items: rows.map(attach), total: Number(countRow?.total ?? 0), page, size };
}

export interface ActivitySummary {
  postCount: number;
  commentCount: number;
  /** 내 글과 댓글이 받은 좋아요를 합친 값 */
  receivedLikes: number;
}

/**
 * 마이페이지 상단 활동 요약.
 *
 * 세 숫자를 쿼리 한 번으로 읽는다 — 화면 하나 그리는 데 왕복을 세 번 할 이유가 없다.
 */
export async function getActivitySummary(userId: number): Promise<ActivitySummary> {
  const row = await queryOne<PostRow & ActivitySummary>(
    `SELECT
       (SELECT COUNT(*) FROM posts    WHERE author_id = ? AND deleted_at IS NULL) AS postCount,
       (SELECT COUNT(*) FROM comments WHERE author_id = ? AND deleted_at IS NULL) AS commentCount,
       (SELECT COALESCE(SUM(likes), 0) FROM posts    WHERE author_id = ? AND deleted_at IS NULL)
       + (SELECT COALESCE(SUM(likes), 0) FROM comments WHERE author_id = ? AND deleted_at IS NULL)
         AS receivedLikes`,
    [userId, userId, userId, userId],
  );

  return {
    postCount: Number(row?.postCount ?? 0),
    commentCount: Number(row?.commentCount ?? 0),
    receivedLikes: Number(row?.receivedLikes ?? 0),
  };
}

export async function listPopularPosts(limit: number): Promise<WithAuthor<Post>[]> {
  const rows = await query<PostRow>(
    `${POST_SELECT}
      WHERE p.deleted_at IS NULL AND p.is_notice = 0
      ORDER BY (p.likes + p.views) DESC, p.id DESC
      LIMIT ?`,
    [limit],
  );
  return rows.map(attach);
}

export async function listNotices(limit: number): Promise<WithAuthor<Post>[]> {
  const rows = await query<PostRow>(
    `${POST_SELECT}
      WHERE p.deleted_at IS NULL AND p.is_notice = 1
      ORDER BY p.created_at DESC
      LIMIT ?`,
    [limit],
  );
  return rows.map(attach);
}

export async function findPostById(id: number): Promise<WithAuthor<Post> | undefined> {
  const row = await queryOne<PostRow>(`${POST_SELECT} WHERE p.id = ? AND p.deleted_at IS NULL`, [id]);
  return row ? attach(row) : undefined;
}

export type NewPost = Omit<Post, "id" | "createdAt" | "views" | "likes" | "commentCount">;

export async function createPost(data: NewPost): Promise<WithAuthor<Post>> {
  const board = await queryOne<PostRow & { id: number }>("SELECT id FROM boards WHERE slug = ?", [
    data.boardSlug,
  ]);
  if (!board) throw new Error(`게시판을 찾을 수 없습니다: ${data.boardSlug}`);

  const { insertId } = await execute(
    `INSERT INTO posts (board_id, author_id, category, title, content, content_json,
       content_html, thumbnail_url, image_count, is_notice, has_image, thumb_color,
       price, trade_status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      board.id,
      data.authorId,
      data.category ?? null,
      data.title,
      data.content,
      data.contentJson ? JSON.stringify(data.contentJson) : null,
      data.contentHtml ?? null,
      data.thumbnailUrl ?? null,
      data.imageCount ?? 0,
      data.isNotice ? 1 : 0,
      data.hasImage ? 1 : 0,
      data.thumbColor ?? null,
      data.price ?? null,
      data.tradeStatus ?? null,
    ],
  );

  const created = await findPostById(insertId);
  if (!created) throw new Error("게시글 생성 후 조회에 실패했습니다.");
  return created;
}

/**
 * 글 수정에 넘길 값.
 *
 * `undefined` 는 "안 건드림", `null` 은 "비우기" 다 — 말머리를 지우는 것과
 * 말머리를 그대로 두는 것은 다른 동작이라 구분이 필요하다.
 */
export type PostPatch = Partial<{
  category: string | null;
  title: string;
  content: string;
  contentJson: Post["contentJson"] | null;
  contentHtml: string | null;
  thumbnailUrl: string | null;
  imageCount: number | null;
  hasImage: boolean | null;
  price: number | null;
  tradeStatus: Post["tradeStatus"] | null;
}>;

/**
 * 운영진 전용 조작 — 공지 지정과 게시판 이동.
 *
 * 본인 글 수정(PostPatch)과 섞지 않는다. 글쓴이가 자기 글을 공지로 올리거나
 * 다른 게시판으로 옮길 수 있으면 안 되기 때문이다.
 */
export async function setNotice(id: number, isNotice: boolean): Promise<boolean> {
  const { affectedRows } = await execute(
    "UPDATE posts SET is_notice = ? WHERE id = ? AND deleted_at IS NULL",
    [isNotice ? 1 : 0, id],
  );
  return affectedRows > 0;
}

export async function moveToBoard(id: number, boardSlug: string): Promise<boolean> {
  const board = await queryOne<PostRow & { id: number }>("SELECT id FROM boards WHERE slug = ?", [
    boardSlug,
  ]);
  if (!board) return false;

  const { affectedRows } = await execute(
    "UPDATE posts SET board_id = ? WHERE id = ? AND deleted_at IS NULL",
    [board.id, id],
  );
  return affectedRows > 0;
}

/** 삭제한 글 되살리기 — 운영진이 실수로 지웠거나 신고가 반려됐을 때 */
export async function restorePost(id: number): Promise<boolean> {
  const { affectedRows } = await execute(
    "UPDATE posts SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL",
    [id],
  );
  return affectedRows > 0;
}

/**
 * 운영 화면용 글 목록.
 *
 * 일반 목록과 달리 **삭제한 글도 보여 준다** — 되살리려면 보여야 하고,
 * 무엇이 지워졌는지 확인하는 것도 운영의 일이다.
 */
export interface AdminPostQuery {
  boardSlug?: string;
  q?: string;
  scope?: SearchScope;
  /** 기본은 삭제한 글 제외 */
  includeDeleted?: boolean;
  onlyNotice?: boolean;
  page: number;
  size: number;
}

export async function listPostsForAdmin(q: AdminPostQuery) {
  const where: string[] = [];
  const params: unknown[] = [];

  if (!q.includeDeleted) where.push("p.deleted_at IS NULL");
  if (q.boardSlug) {
    where.push("b.slug = ?");
    params.push(q.boardSlug);
  }
  if (q.onlyNotice) where.push("p.is_notice = 1");
  if (q.q?.trim()) {
    const like = `%${escapeLike(q.q.trim())}%`;
    if (q.scope === "author") {
      where.push("u.nickname LIKE ?");
      params.push(like);
    } else {
      where.push("(p.title LIKE ? OR p.content LIKE ?)");
      params.push(like, like);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRow = await queryOne<PostRow & { total: number }>(
    `SELECT COUNT(*) AS total
       FROM posts p
       JOIN boards b ON b.id = p.board_id
       LEFT JOIN users u ON u.id = p.author_id
      ${whereSql}`,
    params,
  );

  const offset = Math.max(0, (q.page - 1) * q.size);
  const rows = await query<PostRow>(
    `${POST_SELECT} ${whereSql} ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`,
    [...params, q.size, offset],
  );

  return {
    items: rows.map((r) => ({ ...attach(r), deletedAt: r.deleted_at ?? undefined })),
    total: Number(countRow?.total ?? 0),
    page: q.page,
    size: q.size,
  };
}

/** 글 수정 — 넘어온 필드만 바꾼다 */
export async function updatePost(id: number, patch: PostPatch): Promise<WithAuthor<Post> | undefined> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const put = (col: string, v: unknown) => {
    sets.push(`${col} = ?`);
    params.push(v);
  };

  if (patch.category !== undefined) put("category", patch.category ?? null);
  if (patch.title !== undefined) put("title", patch.title);
  if (patch.content !== undefined) put("content", patch.content);
  if (patch.contentJson !== undefined) put("content_json", patch.contentJson ? JSON.stringify(patch.contentJson) : null);
  if (patch.contentHtml !== undefined) put("content_html", patch.contentHtml ?? null);
  if (patch.thumbnailUrl !== undefined) put("thumbnail_url", patch.thumbnailUrl ?? null);
  if (patch.imageCount !== undefined) put("image_count", patch.imageCount ?? 0);
  if (patch.hasImage !== undefined) put("has_image", patch.hasImage ? 1 : 0);
  if (patch.price !== undefined) put("price", patch.price ?? null);
  if (patch.tradeStatus !== undefined) put("trade_status", patch.tradeStatus ?? null);

  if (sets.length === 0) return findPostById(id);

  params.push(id);
  await execute(`UPDATE posts SET ${sets.join(", ")} WHERE id = ?`, params);
  return findPostById(id);
}

/**
 * 글 삭제 — 소프트 삭제.
 *
 * 실제로 지우지 않는 이유: 댓글·좋아요가 글을 참조하고 있고,
 * 신고 처리나 복구 요청에 대응하려면 원본이 남아 있어야 한다.
 */
export async function softDeletePost(id: number): Promise<boolean> {
  const { affectedRows } = await execute(
    "UPDATE posts SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
    [id],
  );
  return affectedRows > 0;
}

/** 댓글 수정 */
export async function updateComment(id: number, content: string): Promise<WithAuthor<Comment> | undefined> {
  await execute("UPDATE comments SET content = ? WHERE id = ?", [content, id]);
  const row = await queryOne<CommentRow>(`${COMMENT_SELECT} WHERE c.id = ?`, [id]);
  return row ? attachComment(row) : undefined;
}

/** 댓글 삭제 — 소프트 삭제 + 글의 댓글 수 감소 */
export async function softDeleteComment(id: number, postId: number): Promise<boolean> {
  return transaction(async (conn) => {
    const [res] = await conn.execute(
      "UPDATE comments SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    const ok = (res as { affectedRows: number }).affectedRows > 0;
    if (ok) {
      // 0 밑으로 내려가지 않게 한다 — 집계가 어긋난 적이 있어도 음수가 되면 안 된다
      await conn.execute(
        "UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?",
        [postId],
      );
    }
    return ok;
  });
}

/** 조회수 +1 — 실패해도 본문 조회를 막지 않도록 호출 쪽에서 await 를 생략할 수 있다 */
export async function increaseViews(id: number) {
  await execute("UPDATE posts SET views = views + 1 WHERE id = ?", [id]);
}

// ---------------------------------------------------------------------------

const COMMENT_SELECT = `
  SELECT c.*, ${AUTHOR_COLUMNS}
    FROM comments c
    LEFT JOIN users u ON u.id = c.author_id`;

const attachComment = (r: CommentRow): WithAuthor<Comment> => ({
  ...toComment(r),
  author: toAuthor(r as never),
});

export async function listCommentsByPost(postId: number): Promise<WithAuthor<Comment>[]> {
  const rows = await query<CommentRow>(
    `${COMMENT_SELECT} WHERE c.post_id = ? AND c.deleted_at IS NULL ORDER BY c.created_at, c.id`,
    [postId],
  );
  return rows.map(attachComment);
}

export async function findCommentById(id: number): Promise<Comment | undefined> {
  const row = await queryOne<CommentRow>("SELECT * FROM comments WHERE id = ?", [id]);
  return row ? toComment(row) : undefined;
}

export type NewComment = Omit<Comment, "id" | "createdAt" | "likes">;

export async function createComment(data: NewComment): Promise<WithAuthor<Comment>> {
  // 댓글 추가와 집계 갱신이 어긋나지 않게 한 트랜잭션으로 묶는다
  const id = await transaction(async (conn) => {
    const [res] = await conn.execute(
      `INSERT INTO comments (post_id, author_id, parent_id, content) VALUES (?,?,?,?)`,
      [data.postId, data.authorId, data.parentId ?? null, data.content],
    );
    await conn.execute("UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?", [
      data.postId,
    ]);
    return (res as { insertId: number }).insertId;
  });

  const row = await queryOne<CommentRow>(`${COMMENT_SELECT} WHERE c.id = ?`, [id]);
  if (!row) throw new Error("댓글 생성 후 조회에 실패했습니다.");
  return attachComment(row);
}
