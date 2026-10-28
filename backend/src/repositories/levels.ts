// 등급 자동 승급 — 활동량을 읽어 올려줄 사람을 찾는다.
import type { RowDataPacket } from "mysql2";
import { execute, query, queryOne } from "../db/pool.js";
import { type Activity, promotionFor } from "../lib/levels.js";
import type { MemberLevel } from "../types.js";

interface ActivityRow extends RowDataPacket {
  id: number;
  nickname: string;
  level: MemberLevel;
  posts: number;
  comments: number;
  logs: number;
  days_since_join: number;
}

const ACTIVITY_SELECT = `
  SELECT u.id, u.nickname, u.level,
         (SELECT COUNT(*) FROM posts p     WHERE p.author_id = u.id AND p.deleted_at IS NULL) AS posts,
         (SELECT COUNT(*) FROM comments c  WHERE c.author_id = u.id AND c.deleted_at IS NULL) AS comments,
         (SELECT COUNT(*) FROM dive_logs d WHERE d.user_id   = u.id)                          AS logs,
         DATEDIFF(CURDATE(), u.joined_at) AS days_since_join
    FROM users u`;

const toActivity = (r: ActivityRow): Activity => ({
  posts: Number(r.posts),
  comments: Number(r.comments),
  logs: Number(r.logs),
  daysSinceJoin: Number(r.days_since_join),
});

export async function getActivity(userId: number): Promise<Activity | undefined> {
  const row = await queryOne<ActivityRow>(`${ACTIVITY_SELECT} WHERE u.id = ?`, [userId]);
  return row ? toActivity(row) : undefined;
}

export interface Promotion {
  userId: number;
  nickname: string;
  from: MemberLevel;
  to: MemberLevel;
}

/**
 * 한 사람의 등급을 다시 매긴다.
 *
 * 글·댓글·로그를 쓴 직후에 부른다. 올라갈 게 없으면 아무것도 하지 않는다.
 * 호출하는 쪽은 await 하지 않아도 된다 — 승급이 늦어도 글쓰기는 끝나야 한다.
 */
export async function refreshLevel(userId: number): Promise<Promotion | undefined> {
  const row = await queryOne<ActivityRow>(`${ACTIVITY_SELECT} WHERE u.id = ?`, [userId]);
  if (!row) return undefined;

  const next = promotionFor(row.level, toActivity(row));
  if (!next) return undefined;

  await execute("UPDATE users SET level = ? WHERE id = ?", [next, userId]);
  return { userId, nickname: row.nickname, from: row.level, to: next };
}

/** 전체 점검 — 규칙을 바꿨거나 한동안 안 돌렸을 때 한 번에 맞춘다 */
export async function refreshAllLevels(): Promise<Promotion[]> {
  const rows = await query<ActivityRow>(ACTIVITY_SELECT);
  const promotions: Promotion[] = [];

  for (const row of rows) {
    const next = promotionFor(row.level, toActivity(row));
    if (!next) continue;
    await execute("UPDATE users SET level = ? WHERE id = ?", [next, row.id]);
    promotions.push({ userId: row.id, nickname: row.nickname, from: row.level, to: next });
  }
  return promotions;
}
