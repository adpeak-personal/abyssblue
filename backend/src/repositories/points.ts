// 다이빙 포인트 저장소 (MySQL)
import { query, queryOne } from "../db/pool.js";
import type { Difficulty, DivePoint, Region } from "../types.js";
import { toPoint, type PointRow } from "./rows.js";
import type { RowDataPacket } from "mysql2";

export interface PointQuery {
  region?: Region;
  difficulty?: Difficulty;
  q?: string;
}

interface TempRow extends RowDataPacket {
  point_id: number;
  month: number;
  temp: string | number;
}

/** 포인트들의 월별 수온을 한 번에 읽어 id 별로 묶는다 (포인트마다 조회하면 N+1) */
async function waterTempsFor(ids: number[]) {
  const map = new Map<number, DivePoint["waterTemp"]>();
  if (ids.length === 0) return map;

  const rows = await query<TempRow>(
    `SELECT point_id, month, temp FROM dive_point_water_temps
      WHERE point_id IN (${ids.map(() => "?").join(",")})
      ORDER BY point_id, month`,
    ids,
  );
  for (const r of rows) {
    const list = map.get(r.point_id) ?? [];
    list.push({ month: r.month, temp: Number(r.temp) });
    map.set(r.point_id, list);
  }
  return map;
}

export async function listPoints(q: PointQuery = {}): Promise<DivePoint[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (q.region) {
    where.push("region = ?");
    params.push(q.region);
  }
  if (q.difficulty) {
    where.push("difficulty = ?");
    params.push(q.difficulty);
  }
  if (q.q?.trim()) {
    // 이름·지역·설명과 생물 목록(JSON)까지 훑는다
    where.push("(name LIKE ? OR area LIKE ? OR country LIKE ? OR description LIKE ? OR marine_life LIKE ?)");
    const like = `%${q.q.trim()}%`;
    params.push(like, like, like, like, like);
  }

  const rows = await query<PointRow>(
    `SELECT * FROM dive_points ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id`,
    params,
  );
  const temps = await waterTempsFor(rows.map((r) => r.id));
  return rows.map((r) => toPoint(r, temps.get(r.id) ?? []));
}

export async function findPointById(id: number): Promise<DivePoint | undefined> {
  const row = await queryOne<PointRow>("SELECT * FROM dive_points WHERE id = ?", [id]);
  if (!row) return undefined;
  const temps = await waterTempsFor([id]);
  return toPoint(row, temps.get(id) ?? []);
}
