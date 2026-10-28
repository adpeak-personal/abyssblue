// 업로드 기록 저장소.
//
// 파일은 업로드 즉시 저장되고, 글이 등록될 때 post_id 가 채워진다.
// 글을 안 쓰고 나간 파일은 post_id 가 NULL 로 남으므로 그것만 주기적으로 지운다 —
// 파일시스템이나 S3 를 통째로 훑을 필요가 없다.
import type { RowDataPacket } from "mysql2";
import { execute, query } from "../db/pool.js";

export interface UploadRecord {
  /** UUID — 저장 파일명과 같다 */
  id: string;
  uploaderId?: number;
  /** 본문용 경로 (`/2026/10/x.webp`) */
  url: string;
  thumbUrl?: string;
  archiveUrl?: string;
  mime: string;
  bytes: number;
  width?: number;
  height?: number;
}

export async function recordUpload(data: UploadRecord) {
  await execute(
    `INSERT INTO uploads (id, uploader_id, url, thumb_url, archive_url, mime, bytes, width, height)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      data.id,
      data.uploaderId ?? null,
      data.url,
      data.thumbUrl ?? null,
      data.archiveUrl ?? null,
      data.mime,
      data.bytes,
      data.width ?? null,
      data.height ?? null,
    ],
  );
}

/** 나중에 만든 썸네일 경로를 기록한다 — 청소할 때 같이 지워지게 */
export async function setThumbUrl(url: string, thumbUrl: string) {
  const { affectedRows } = await execute("UPDATE uploads SET thumb_url = ? WHERE url = ?", [
    thumbUrl,
    url,
  ]);
  return affectedRows;
}

/**
 * 글에 실제로 쓰인 이미지를 그 글에 연결한다.
 *
 * 본문에서 빠진 이미지는 연결되지 않으므로 나중에 청소 대상이 된다.
 */
export async function linkUploadsToPost(postId: number, urls: string[]) {
  if (urls.length === 0) return 0;
  const marks = urls.map(() => "?").join(",");
  const { affectedRows } = await execute(
    `UPDATE uploads SET post_id = ? WHERE url IN (${marks})`,
    [postId, ...urls],
  );
  return affectedRows;
}

/**
 * 글 수정 시 이미지 연결을 다시 맞춘다.
 *
 * 본문에서 빠진 이미지는 연결을 끊어 청소 대상으로 돌리고,
 * 새로 들어온 이미지는 이 글에 묶는다. 이게 없으면 수정으로 뺀 이미지가
 * post_id 를 그대로 달고 있어서 영영 지워지지 않는다.
 */
export async function relinkUploadsToPost(postId: number, urls: string[]) {
  if (urls.length === 0) {
    const { affectedRows } = await execute("UPDATE uploads SET post_id = NULL WHERE post_id = ?", [postId]);
    return { linked: 0, unlinked: affectedRows };
  }

  const marks = urls.map(() => "?").join(",");
  // 더 이상 안 쓰이는 것부터 끊는다
  const { affectedRows: unlinked } = await execute(
    `UPDATE uploads SET post_id = NULL WHERE post_id = ? AND url NOT IN (${marks})`,
    [postId, ...urls],
  );
  const { affectedRows: linked } = await execute(
    `UPDATE uploads SET post_id = ? WHERE url IN (${marks})`,
    [postId, ...urls],
  );
  return { linked, unlinked };
}

/** 글이 삭제되면 그 글의 이미지도 청소 대상으로 돌린다 */
export async function unlinkUploadsOfPost(postId: number) {
  const { affectedRows } = await execute("UPDATE uploads SET post_id = NULL WHERE post_id = ?", [postId]);
  return affectedRows;
}

interface OrphanRow extends RowDataPacket {
  id: string;
  url: string;
  thumb_url: string | null;
  archive_url: string | null;
  bytes: number;
  created_at: string;
}

export interface Orphan {
  id: string;
  /** 지워야 할 모든 파생본 경로 */
  paths: string[];
  bytes: number;
  createdAt: string;
}

/**
 * 어느 글에도 안 쓰인 채 일정 시간이 지난 업로드.
 *
 * 유예 시간을 두는 이유 — 지금 글을 쓰는 중인 사람의 이미지를 지우면 안 된다.
 */
export async function findOrphans(olderThanHours: number): Promise<Orphan[]> {
  const rows = await query<OrphanRow>(
    `SELECT id, url, thumb_url, archive_url, bytes, created_at
       FROM uploads
      WHERE post_id IS NULL
        AND created_at < NOW() - INTERVAL ? HOUR
      ORDER BY created_at`,
    [olderThanHours],
  );

  return rows.map((r) => ({
    id: r.id,
    paths: [r.url, r.thumb_url, r.archive_url].filter((v): v is string => Boolean(v)),
    bytes: Number(r.bytes),
    createdAt: r.created_at,
  }));
}

export async function deleteUploadRecords(ids: string[]) {
  if (ids.length === 0) return 0;
  const marks = ids.map(() => "?").join(",");
  const { affectedRows } = await execute(`DELETE FROM uploads WHERE id IN (${marks})`, ids);
  return affectedRows;
}

/** 기록에 남은 모든 경로 — 저장소와 대조할 때 쓴다 */
export async function listAllPaths(): Promise<Set<string>> {
  const rows = await query<OrphanRow>("SELECT url, thumb_url, archive_url FROM uploads");
  const set = new Set<string>();
  for (const r of rows) {
    for (const v of [r.url, r.thumb_url, r.archive_url]) if (v) set.add(v);
  }
  return set;
}
