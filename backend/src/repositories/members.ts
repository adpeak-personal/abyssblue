// 회원 관리 (운영진용) — 조회 · 등급 변경 · 정지 · 탈퇴 처리.
//
// 정지·탈퇴는 행을 지우지 않고 상태로 둔다. 글·댓글·로그가 회원을 참조하고 있어서
// 실제로 지우면 그 사람이 쓴 것들이 전부 깨진다.
import type { RowDataPacket } from "mysql2";
import { execute, query, queryOne } from "../db/pool.js";
import type { MemberLevel } from "../types.js";

export type MemberStatus = "활동" | "정지" | "탈퇴";

export interface MemberRow extends RowDataPacket {
  id: number;
  email: string;
  nickname: string;
  avatar_color: string;
  level: MemberLevel;
  status: MemberStatus;
  suspended_until: string | null;
  status_reason: string | null;
  cert_agency: string;
  cert_level: string;
  phone: string | null;
  provider: string | null;
  joined_at: string;
  last_login_at: string | null;
  post_count: number;
  comment_count: number;
  report_count: number;
}

export interface Member {
  id: number;
  email: string;
  nickname: string;
  avatarColor: string;
  level: MemberLevel;
  status: MemberStatus;
  suspendedUntil?: string;
  statusReason?: string;
  certAgency: string;
  certLevel: string;
  /** 가운데를 가린 번호 — 운영 화면에서도 전체를 보여줄 이유가 없다 */
  phoneMasked?: string;
  provider?: string;
  joinedAt: string;
  lastLoginAt?: string;
  postCount: number;
  commentCount: number;
  /** 이 회원이 받은 신고 수 */
  reportCount: number;
}

/** 010-1234-5678 → 010-****-5678 */
function maskPhone(phone: string | null): string | undefined {
  if (!phone) return undefined;
  const d = phone.replace(/\D/g, "");
  if (d.length < 10) return "***";
  return `${d.slice(0, 3)}-****-${d.slice(-4)}`;
}

const toMember = (r: MemberRow): Member => ({
  id: r.id,
  email: r.email,
  nickname: r.nickname,
  avatarColor: r.avatar_color,
  level: r.level,
  status: r.status,
  suspendedUntil: r.suspended_until ?? undefined,
  statusReason: r.status_reason ?? undefined,
  certAgency: r.cert_agency,
  certLevel: r.cert_level,
  phoneMasked: maskPhone(r.phone),
  provider: r.provider ?? undefined,
  joinedAt: String(r.joined_at).slice(0, 10),
  lastLoginAt: r.last_login_at ?? undefined,
  postCount: Number(r.post_count),
  commentCount: Number(r.comment_count),
  reportCount: Number(r.report_count),
});

export interface MemberQuery {
  q?: string;
  level?: MemberLevel;
  status?: MemberStatus;
  page: number;
  size: number;
}

/** LIKE 특수문자를 글자 그대로 취급하게 한다 */
const escapeLike = (raw: string) => raw.replace(/[\\%_]/g, (ch) => "\\" + ch);

const SELECT = `
  SELECT u.*,
         (SELECT COUNT(*) FROM posts p    WHERE p.author_id = u.id AND p.deleted_at IS NULL) AS post_count,
         (SELECT COUNT(*) FROM comments c WHERE c.author_id = u.id AND c.deleted_at IS NULL) AS comment_count,
         (SELECT COUNT(*) FROM reports r  WHERE r.target_type = 'user' AND r.target_id = u.id) AS report_count
    FROM users u`;

function buildFilter(q: MemberQuery) {
  const where: string[] = [];
  const params: unknown[] = [];

  if (q.q?.trim()) {
    // 닉네임과 이메일 둘 다에서 찾는다 — 운영진은 둘 중 아는 쪽으로 검색한다
    const like = `%${escapeLike(q.q.trim())}%`;
    where.push("(u.nickname LIKE ? OR u.email LIKE ?)");
    params.push(like, like);
  }
  if (q.level) {
    where.push("u.level = ?");
    params.push(q.level);
  }
  if (q.status) {
    where.push("u.status = ?");
    params.push(q.status);
  }
  return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

export async function listMembers(q: MemberQuery) {
  const { sql: whereSql, params } = buildFilter(q);

  const countRow = await queryOne<RowDataPacket & { total: number }>(
    `SELECT COUNT(*) AS total FROM users u ${whereSql}`,
    params,
  );

  const offset = Math.max(0, (q.page - 1) * q.size);
  const rows = await query<MemberRow>(
    `${SELECT} ${whereSql} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
    [...params, q.size, offset],
  );

  return {
    items: rows.map(toMember),
    total: Number(countRow?.total ?? 0),
    page: q.page,
    size: q.size,
  };
}

export async function findMember(id: number): Promise<Member | undefined> {
  const row = await queryOne<MemberRow>(`${SELECT} WHERE u.id = ?`, [id]);
  return row ? toMember(row) : undefined;
}

export async function setLevel(id: number, level: MemberLevel) {
  await execute("UPDATE users SET level = ? WHERE id = ?", [level, id]);
}

export interface StatusChange {
  status: MemberStatus;
  /** 정지일 때만. 없으면 무기한 */
  days?: number;
  reason?: string;
}

export async function setStatus(id: number, change: StatusChange) {
  const until =
    change.status === "정지" && change.days ? `NOW() + INTERVAL ${Number(change.days)} DAY` : "NULL";

  await execute(
    `UPDATE users
        SET status = ?,
            suspended_until = ${until},
            status_reason = ?
      WHERE id = ?`,
    [change.status, change.reason ?? null, id],
  );
}

/**
 * 정지가 끝난 회원을 다시 활동 상태로 되돌린다.
 *
 * 로그인할 때마다 확인하는 것보다, 기간이 지났으면 그때 풀어 주는 쪽이 단순하다.
 */
export async function releaseExpiredSuspensions(): Promise<number> {
  const { affectedRows } = await execute(
    `UPDATE users
        SET status = '활동', suspended_until = NULL, status_reason = NULL
      WHERE status = '정지' AND suspended_until IS NOT NULL AND suspended_until <= NOW()`,
  );
  return affectedRows;
}
