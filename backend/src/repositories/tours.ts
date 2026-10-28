// 투어/모집 저장소 (MySQL)
import { query, queryOne } from "../db/pool.js";
import type { Tour } from "../types.js";
import { toTour, type TourRow } from "./rows.js";

export interface TourQuery {
  type?: Tour["type"];
  status?: Tour["status"];
}

export async function listTours(q: TourQuery = {}): Promise<Tour[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (q.type) {
    where.push("type = ?");
    params.push(q.type);
  }
  if (q.status) {
    where.push("status = ?");
    params.push(q.status);
  }

  const rows = await query<TourRow>(
    `SELECT * FROM tours ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY start_date, id`,
    params,
  );
  return rows.map(toTour);
}

export async function findTourById(id: number): Promise<Tour | undefined> {
  const row = await queryOne<TourRow>("SELECT * FROM tours WHERE id = ?", [id]);
  return row ? toTour(row) : undefined;
}
