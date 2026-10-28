// 다이브 로그 저장소 (MySQL)
import type { RowDataPacket } from "mysql2";
import { query, queryOne, transaction } from "../db/pool.js";
import type { DiveLog } from "../types.js";
import { toLog, type LogRow } from "./rows.js";

export interface DiveLogStats {
  totalDives: number;
  maxDepth: number;
  totalBottomTime: number; // 분
  avgWaterTemp: number;
  pointsVisited: number;
}

interface SightingRow extends RowDataPacket {
  log_id: number;
  species: string;
}

/** 로그들의 관찰 생물을 한 번에 읽어 묶는다 (로그마다 조회하면 N+1) */
async function sightingsFor(ids: number[]) {
  const map = new Map<number, string[]>();
  if (ids.length === 0) return map;

  const rows = await query<SightingRow>(
    `SELECT log_id, species FROM dive_log_sightings
      WHERE log_id IN (${ids.map(() => "?").join(",")})
      ORDER BY log_id, id`,
    ids,
  );
  for (const r of rows) {
    const list = map.get(r.log_id) ?? [];
    list.push(r.species);
    map.set(r.log_id, list);
  }
  return map;
}

export interface LogQuery {
  userId?: number;
  /** 포인트 상세의 "최근 회원 로그" 용 */
  pointId?: number;
  limit?: number;
}

export async function listLogs(q: LogQuery = {}): Promise<DiveLog[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (q.userId !== undefined) {
    where.push("user_id = ?");
    params.push(q.userId);
  }
  if (q.pointId !== undefined) {
    where.push("point_id = ?");
    params.push(q.pointId);
    // 포인트 상세는 남의 로그를 보여주는 자리다 — 비공개로 적은 건 빼야 한다
    if (q.userId === undefined) where.push("is_public = 1");
  }

  const rows = await query<LogRow>(
    `SELECT * FROM dive_logs
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY dive_date DESC, dive_no DESC
     ${q.limit ? "LIMIT ?" : ""}`,
    q.limit ? [...params, q.limit] : params,
  );
  const sightings = await sightingsFor(rows.map((r) => r.id));
  return rows.map((r) => toLog(r, sightings.get(r.id) ?? []));
}

interface StatsRow extends RowDataPacket {
  total_dives: number;
  max_depth: string | number | null;
  total_bottom_time: string | number | null;
  avg_water_temp: string | number | null;
  points_visited: number;
}

/** 집계는 SQL 로 — 전체 로그를 끌어와 JS 에서 더하지 않는다 */
export async function getLogStats(userId?: number): Promise<DiveLogStats> {
  const row = await queryOne<StatsRow>(
    `SELECT COUNT(*) AS total_dives,
            MAX(max_depth) AS max_depth,
            SUM(bottom_time) AS total_bottom_time,
            AVG(water_temp) AS avg_water_temp,
            COUNT(DISTINCT point_id) AS points_visited
       FROM dive_logs ${userId === undefined ? "" : "WHERE user_id = ?"}`,
    userId === undefined ? [] : [userId],
  );

  if (!row || Number(row.total_dives) === 0) {
    return { totalDives: 0, maxDepth: 0, totalBottomTime: 0, avgWaterTemp: 0, pointsVisited: 0 };
  }

  return {
    totalDives: Number(row.total_dives),
    maxDepth: Number(row.max_depth ?? 0),
    totalBottomTime: Number(row.total_bottom_time ?? 0),
    avgWaterTemp: Math.round(Number(row.avg_water_temp ?? 0) * 10) / 10,
    pointsVisited: Number(row.points_visited),
  };
}

export async function findLogById(id: number): Promise<DiveLog | undefined> {
  const row = await queryOne<LogRow>("SELECT * FROM dive_logs WHERE id = ?", [id]);
  if (!row) return undefined;
  const sightings = await sightingsFor([id]);
  return toLog(row, sightings.get(id) ?? []);
}

export async function createLog(data: Omit<DiveLog, "id" | "diveNo">): Promise<DiveLog> {
  // 다이브 번호 채번과 삽입이 어긋나지 않게 한 트랜잭션으로 묶는다
  const id = await transaction(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT COALESCE(MAX(dive_no), 0) + 1 AS next_no FROM dive_logs WHERE user_id = ? FOR UPDATE",
      [data.userId],
    );
    const diveNo = Number(rows[0]?.next_no ?? 1);

    const [res] = await conn.execute(
      `INSERT INTO dive_logs (user_id, dive_no, dive_date, point_id, point_name, max_depth,
         avg_depth, bottom_time, water_temp, visibility, suit, weight, tank_start, tank_end,
         buddy, dive_time, entry_type, current, weather, waves, tank, is_public, memo, rating)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        data.userId, diveNo, data.date.slice(0, 10), data.pointId ?? null, data.pointName,
        data.maxDepth, data.avgDepth, data.bottomTime, data.waterTemp, data.visibility,
        data.suit, data.weight, data.tankStart, data.tankEnd, data.buddy ?? null,
        data.diveTime ?? null, data.entryType ?? null, data.current ?? null,
        data.weather ?? null, data.waves ?? null, data.tank ?? null,
        data.isPublic ? 1 : 0, data.memo, data.rating,
      ],
    );
    const logId = (res as { insertId: number }).insertId;

    for (const species of new Set(data.sightings)) {
      await conn.execute("INSERT INTO dive_log_sightings (log_id, species) VALUES (?,?)", [
        logId,
        species,
      ]);
    }
    return logId;
  });

  const created = await findLogById(id);
  if (!created) throw new Error("로그 생성 후 조회에 실패했습니다.");
  return created;
}
