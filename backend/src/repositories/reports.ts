// 신고 저장소.
//
// 글·댓글·회원을 한 표로 받는다. 대상이 지워져도 신고 기록은 남아야 해서
// 외래키를 걸지 않았고, 대신 조회할 때 남아 있는 대상만 내용을 붙여 준다.
import type { RowDataPacket } from "mysql2";
import { execute, query, queryOne } from "../db/pool.js";

export type ReportTarget = "post" | "comment" | "user";
export type ReportStatus = "접수" | "처리완료" | "반려";

export const REPORT_REASONS = [
  "스팸/광고",
  "욕설/비방",
  "음란물",
  "허위정보",
  "안전 위험",
  "기타",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface NewReport {
  targetType: ReportTarget;
  targetId: number;
  reporterId: number;
  reason: ReportReason;
  detail?: string;
}

/** 이미 신고한 대상이면 false — 중복 신고로 건수를 부풀릴 수 없게 */
export async function createReport(data: NewReport): Promise<boolean> {
  const { affectedRows } = await execute(
    `INSERT IGNORE INTO reports (target_type, target_id, reporter_id, reason, detail)
     VALUES (?,?,?,?,?)`,
    [data.targetType, data.targetId, data.reporterId, data.reason, data.detail ?? null],
  );
  return affectedRows > 0;
}

interface ReportRow extends RowDataPacket {
  id: number;
  target_type: ReportTarget;
  target_id: number;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  handler_memo: string | null;
  handled_at: string | null;
  created_at: string;
  reporter: string | null;
  handler: string | null;
  /** 남아 있는 대상의 요약 — 지워졌으면 NULL */
  target_label: string | null;
  target_author: string | null;
  target_author_id: number | null;
  board_slug: string | null;
  post_id: number | null;
}

export interface Report {
  id: number;
  targetType: ReportTarget;
  targetId: number;
  reason: ReportReason;
  detail?: string;
  status: ReportStatus;
  handlerMemo?: string;
  handledAt?: string;
  createdAt: string;
  reporter?: string;
  handler?: string;
  /** 신고 대상의 내용 요약. 지워졌으면 없다 */
  targetLabel?: string;
  targetAuthor?: string;
  targetAuthorId?: number;
  /** 대상으로 바로 갈 수 있는 링크 */
  link?: string;
}

function toReport(r: ReportRow): Report {
  let link: string | undefined;
  if (r.target_type === "post" && r.board_slug) link = `/board/${r.board_slug}/${r.target_id}`;
  else if (r.target_type === "comment" && r.board_slug && r.post_id) {
    link = `/board/${r.board_slug}/${r.post_id}`;
  }

  return {
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason,
    detail: r.detail ?? undefined,
    status: r.status,
    handlerMemo: r.handler_memo ?? undefined,
    handledAt: r.handled_at ?? undefined,
    createdAt: r.created_at,
    reporter: r.reporter ?? undefined,
    handler: r.handler ?? undefined,
    targetLabel: r.target_label ?? undefined,
    targetAuthor: r.target_author ?? undefined,
    targetAuthorId: r.target_author_id ?? undefined,
    link,
  };
}

/**
 * 신고 목록.
 *
 * 대상 종류가 셋이라 LEFT JOIN 을 세 번 걸고 종류에 맞는 값만 고른다.
 * 대상이 지워졌으면 전부 NULL 로 와서 "삭제된 대상" 으로 표시된다.
 */
const SELECT = `
  SELECT r.*,
         ru.nickname AS reporter,
         hu.nickname AS handler,
         CASE r.target_type
           WHEN 'post'    THEN LEFT(p.title, 60)
           WHEN 'comment' THEN LEFT(c.content, 60)
           WHEN 'user'    THEN tu.nickname
         END AS target_label,
         CASE r.target_type
           WHEN 'post'    THEN pa.nickname
           WHEN 'comment' THEN ca.nickname
           WHEN 'user'    THEN tu.nickname
         END AS target_author,
         CASE r.target_type
           WHEN 'post'    THEN p.author_id
           WHEN 'comment' THEN c.author_id
           WHEN 'user'    THEN tu.id
         END AS target_author_id,
         CASE r.target_type
           WHEN 'post'    THEN pb.slug
           WHEN 'comment' THEN cb.slug
         END AS board_slug,
         c.post_id AS post_id
    FROM reports r
    LEFT JOIN users ru ON ru.id = r.reporter_id
    LEFT JOIN users hu ON hu.id = r.handled_by
    LEFT JOIN posts p     ON r.target_type = 'post'    AND p.id = r.target_id
    LEFT JOIN boards pb   ON pb.id = p.board_id
    LEFT JOIN users pa    ON pa.id = p.author_id
    LEFT JOIN comments c  ON r.target_type = 'comment' AND c.id = r.target_id
    LEFT JOIN posts cp    ON cp.id = c.post_id
    LEFT JOIN boards cb   ON cb.id = cp.board_id
    LEFT JOIN users ca    ON ca.id = c.author_id
    LEFT JOIN users tu    ON r.target_type = 'user'    AND tu.id = r.target_id`;

export async function listReports(status: ReportStatus | undefined, page: number, size: number) {
  const where = status ? "WHERE r.status = ?" : "";
  const params = status ? [status] : [];

  const countRow = await queryOne<RowDataPacket & { total: number }>(
    `SELECT COUNT(*) AS total FROM reports r ${status ? "WHERE r.status = ?" : ""}`,
    params,
  );

  const offset = Math.max(0, (page - 1) * size);
  const rows = await query<ReportRow>(
    `${SELECT} ${where} ORDER BY r.status = '접수' DESC, r.created_at DESC LIMIT ? OFFSET ?`,
    [...params, size, offset],
  );

  return { items: rows.map(toReport), total: Number(countRow?.total ?? 0), page, size };
}

/** 어드민 메인의 "처리 대기" 뱃지용 */
export async function countPending(): Promise<number> {
  const row = await queryOne<RowDataPacket & { n: number }>(
    "SELECT COUNT(*) AS n FROM reports WHERE status = '접수'",
  );
  return Number(row?.n ?? 0);
}

export async function handleReport(
  id: number,
  status: Exclude<ReportStatus, "접수">,
  handlerId: number,
  memo?: string,
): Promise<boolean> {
  const { affectedRows } = await execute(
    `UPDATE reports
        SET status = ?, handled_by = ?, handled_at = NOW(), handler_memo = ?
      WHERE id = ?`,
    [status, handlerId, memo ?? null, id],
  );
  return affectedRows > 0;
}
