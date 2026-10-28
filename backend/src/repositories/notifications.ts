// 알림 저장소.
//
// 본문(message)과 링크를 만들 때 박아 둔다. 원본 글이 지워져도 "무슨 알림이었는지" 는
// 남아야 하고, 목록을 띄울 때마다 글·댓글을 조인하지 않기 위해서다.
import type { RowDataPacket } from "mysql2";
import { execute, query, queryOne } from "../db/pool.js";

export type NotificationType = "댓글" | "답글" | "좋아요" | "공지" | "운영";

export interface NewNotification {
  userId: number;
  actorId?: number;
  type: NotificationType;
  message: string;
  link: string;
}

interface Row extends RowDataPacket {
  id: number;
  type: NotificationType;
  message: string;
  link: string;
  read_at: string | null;
  created_at: string;
  actor: string | null;
  actor_color: string | null;
}

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
  actor?: { nickname: string; avatarColor: string };
}

const toNotification = (r: Row): Notification => ({
  id: r.id,
  type: r.type,
  message: r.message,
  link: r.link,
  read: r.read_at != null,
  createdAt: r.created_at,
  actor: r.actor ? { nickname: r.actor, avatarColor: r.actor_color ?? "#94a3b8" } : undefined,
});

/**
 * 알림을 남긴다.
 *
 * 자기 자신에게는 보내지 않는다 — 내 글에 내가 댓글을 달고 알림을 받을 이유가 없다.
 * 알림 저장이 실패해도 원래 동작(댓글 작성 등)을 막으면 안 되므로, 부르는 쪽에서
 * await 하지 않고 던져 둔다.
 */
export async function notify(data: NewNotification): Promise<void> {
  if (data.actorId === data.userId) return;

  await execute(
    "INSERT INTO notifications (user_id, actor_id, type, message, link) VALUES (?,?,?,?,?)",
    [data.userId, data.actorId ?? null, data.type, data.message.slice(0, 200), data.link.slice(0, 300)],
  );
}

export async function listNotifications(userId: number, limit = 20): Promise<Notification[]> {
  const rows = await query<Row>(
    `SELECT n.*, a.nickname AS actor, a.avatar_color AS actor_color
       FROM notifications n
       LEFT JOIN users a ON a.id = n.actor_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT ?`,
    [userId, limit],
  );
  return rows.map(toNotification);
}

export async function countUnread(userId: number): Promise<number> {
  const row = await queryOne<RowDataPacket & { n: number }>(
    "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL",
    [userId],
  );
  return Number(row?.n ?? 0);
}

/** id 를 주면 그것만, 없으면 전부 읽음 처리 */
export async function markRead(userId: number, id?: number): Promise<number> {
  const { affectedRows } = await execute(
    `UPDATE notifications SET read_at = NOW()
      WHERE user_id = ? AND read_at IS NULL ${id ? "AND id = ?" : ""}`,
    id ? [userId, id] : [userId],
  );
  return affectedRows;
}

/** 오래된 읽은 알림 정리 — 쌓이기만 하면 목록이 무거워진다 */
export async function purgeOld(days = 90): Promise<number> {
  const { affectedRows } = await execute(
    "DELETE FROM notifications WHERE read_at IS NOT NULL AND created_at < NOW() - INTERVAL ? DAY",
    [days],
  );
  return affectedRows;
}
