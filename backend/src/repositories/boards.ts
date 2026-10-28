// 게시판 저장소 (MySQL)
import { execute, query, queryOne } from "../db/pool.js";
import type { Board, BoardGroup } from "../types.js";
import { toBoard, type BoardRow } from "./rows.js";

interface GroupRow extends BoardRow {
  g_id: number;
  g_name: string;
}

/**
 * 그룹 + 게시판을 한 번에 읽어 묶는다.
 * 그룹마다 게시판을 따로 조회하면 그룹 수만큼 쿼리가 나간다.
 */
export async function listBoardGroups(): Promise<BoardGroup[]> {
  // 메뉴의 N 배지용으로 "최근 하루 새 글" 여부를 함께 가져온다.
  // EXISTS 라 게시판마다 글을 세지 않는다 — 첫 한 건만 찾으면 끝난다.
  const rows = await query<GroupRow>(`
    SELECT g.id AS g_id, g.name AS g_name, b.*,
           EXISTS(
             SELECT 1 FROM posts p
              WHERE p.board_id = b.id
                AND p.deleted_at IS NULL
                AND p.created_at >= NOW() - INTERVAL 1 DAY
           ) AS has_new_post
      FROM board_groups g
      LEFT JOIN boards b ON b.group_id = g.id
     ORDER BY g.sort_order, g.id, b.sort_order, b.id`);

  const groups = new Map<number, BoardGroup>();
  for (const r of rows) {
    let group = groups.get(r.g_id);
    if (!group) {
      group = { id: r.g_id, name: r.g_name, boards: [] };
      groups.set(r.g_id, group);
    }
    // LEFT JOIN 이라 게시판 없는 그룹은 b.id 가 NULL 로 온다
    if (r.id != null) group.boards.push(toBoard(r));
  }
  return [...groups.values()];
}

export async function findBoardBySlug(slug: string): Promise<Board | undefined> {
  const row = await queryOne<BoardRow>("SELECT * FROM boards WHERE slug = ?", [slug]);
  return row ? toBoard(row) : undefined;
}

export async function findGroupOfBoard(slug: string): Promise<BoardGroup | undefined> {
  const row = await queryOne<GroupRow>(
    `SELECT g.id AS g_id, g.name AS g_name FROM boards b
       JOIN board_groups g ON g.id = b.group_id
      WHERE b.slug = ?`,
    [slug],
  );
  if (!row) return undefined;
  const groups = await listBoardGroups();
  return groups.find((g) => g.id === row.g_id);
}

/** 게시판 설정 수정 — 넘어온 필드만 바꾼다 */
export async function updateBoard(
  slug: string,
  patch: Partial<Omit<Board, "id" | "slug">>,
): Promise<Board | undefined> {
  const sets: string[] = [];
  const params: unknown[] = [];

  const put = (column: string, value: unknown) => {
    sets.push(`${column} = ?`);
    params.push(value);
  };

  if (patch.name !== undefined) put("name", patch.name);
  if (patch.description !== undefined) put("description", patch.description);
  if (patch.type !== undefined) put("type", patch.type);
  if (patch.writeMode !== undefined) put("write_mode", patch.writeMode);
  if (patch.highQuality !== undefined) put("high_quality", patch.highQuality ? 1 : 0);
  if (patch.icon !== undefined) put("icon", patch.icon ?? null);
  if ("categories" in patch) {
    // 빈 배열은 "말머리 없음" 으로 저장
    const list = patch.categories?.length ? patch.categories : null;
    put("categories", list ? JSON.stringify(list) : null);
  }

  if (sets.length === 0) return findBoardBySlug(slug);

  params.push(slug);
  await execute(`UPDATE boards SET ${sets.join(", ")} WHERE slug = ?`, params);
  return findBoardBySlug(slug);
}
