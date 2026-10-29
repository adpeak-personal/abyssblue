// 투어/모집 저장소 (MySQL)
import type { RowDataPacket } from "mysql2";
import { execute, query, queryOne, transaction } from "../db/pool.js";
import type { Tour } from "../types.js";
import { toIso, toTour, type TourRow } from "./rows.js";

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

// ─────────────────────────────────────────────────────────────
// 개설 · 수정 · 삭제
// ─────────────────────────────────────────────────────────────

export interface TourInput {
  title: string;
  type: Tour["type"];
  pointName: string;
  region: Tour["region"];
  startDate: string;
  endDate: string;
  capacity: number;
  price: number;
  minCert: string;
  joinMode: Tour["joinMode"];
  description: string;
}

export async function createTour(hostId: number, input: TourInput): Promise<number> {
  const res = await execute(
    `INSERT INTO tours
       (host_id, title, type, point_name, region, start_date, end_date,
        capacity, price, min_cert, join_mode, description)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      hostId,
      input.title,
      input.type,
      input.pointName,
      input.region,
      input.startDate,
      input.endDate,
      input.capacity,
      input.price,
      input.minCert,
      input.joinMode,
      input.description,
    ],
  );
  const id = res.insertId;
  await refreshTour(id);
  return id;
}

export async function updateTour(id: number, input: TourInput): Promise<void> {
  await execute(
    `UPDATE tours SET title=?, type=?, point_name=?, region=?, start_date=?, end_date=?,
        capacity=?, price=?, min_cert=?, join_mode=?, description=?
      WHERE id = ?`,
    [
      input.title,
      input.type,
      input.pointName,
      input.region,
      input.startDate,
      input.endDate,
      input.capacity,
      input.price,
      input.minCert,
      input.joinMode,
      input.description,
      id,
    ],
  );
  // 정원을 줄이면 마감 여부가 달라진다
  await refreshTour(id);
}

/** 참가자도 같이 사라진다 (tour_participants 가 ON DELETE CASCADE) */
export async function deleteTour(id: number): Promise<void> {
  await execute("DELETE FROM tours WHERE id = ?", [id]);
}

// ─────────────────────────────────────────────────────────────
// 참가자
// ─────────────────────────────────────────────────────────────

export type ParticipantStatus = "신청" | "확정" | "대기" | "취소";

export interface Participant {
  userId: number;
  status: ParticipantStatus;
  joinedAt: string;
}

interface ParticipantRow extends RowDataPacket {
  user_id: number;
  status: ParticipantStatus;
  joined_at: string;
}

const toParticipant = (r: ParticipantRow): Participant => ({
  userId: r.user_id,
  status: r.status,
  joinedAt: toIso(r.joined_at),
});

/** 취소한 사람은 빼고 — 명단에 남아 있으면 주최자가 인원을 잘못 센다 */
export async function listParticipants(tourId: number): Promise<Participant[]> {
  const rows = await query<ParticipantRow>(
    `SELECT user_id, status, joined_at FROM tour_participants
      WHERE tour_id = ? AND status <> '취소'
      ORDER BY joined_at, user_id`,
    [tourId],
  );
  return rows.map(toParticipant);
}

export async function findParticipant(
  tourId: number,
  userId: number,
): Promise<Participant | undefined> {
  const row = await queryOne<ParticipantRow>(
    "SELECT user_id, status, joined_at FROM tour_participants WHERE tour_id = ? AND user_id = ?",
    [tourId, userId],
  );
  return row ? toParticipant(row) : undefined;
}

// ─────────────────────────────────────────────────────────────
// 인원 집계와 상태
// ─────────────────────────────────────────────────────────────

/**
 * `joined` 캐시와 `status` 를 실제 참가자 수에 맞춘다.
 *
 * `joined` 는 '확정' 만 센다 — 신청·대기는 아직 자리를 차지한 게 아니다.
 * 상태 규칙:
 *   끝나는 날이 지났으면         마감
 *   정원이 찼으면                마감
 *   남은 자리가 정원의 20% 이하  마감임박 (최소 1자리, 한 명이라도 있을 때)
 *   그 외                        모집중
 *
 * 20% 로 재는 이유: "남은 자리 N개" 같은 고정값을 쓰면 정원이 작은 투어가
 * 개설하자마자 마감임박이 된다 (정원 2명인 번개는 남은 자리가 늘 2 이하다).
 * 아무도 신청하지 않은 투어를 마감임박이라 부르지 않도록 joined 도 같이 본다.
 */
export async function refreshTour(tourId: number): Promise<void> {
  const row = await queryOne<RowDataPacket & { capacity: number; is_over: number; confirmed: number }>(
    `SELECT t.capacity,
            (t.end_date < CURDATE()) AS is_over,
            (SELECT COUNT(*) FROM tour_participants p
              WHERE p.tour_id = t.id AND p.status = '확정') AS confirmed
       FROM tours t WHERE t.id = ?`,
    [tourId],
  );
  if (!row) return;

  const joined = Number(row.confirmed);
  const left = row.capacity - joined;
  const nearlyFull = Math.max(1, Math.floor(row.capacity * 0.2));
  const status: Tour["status"] =
    Number(row.is_over) === 1 || left <= 0
      ? "마감"
      : joined > 0 && left <= nearlyFull
        ? "마감임박"
        : "모집중";

  await execute("UPDATE tours SET joined = ?, status = ? WHERE id = ?", [joined, status, tourId]);
}

// ─────────────────────────────────────────────────────────────
// 참여 · 취소
// ─────────────────────────────────────────────────────────────

export type JoinOutcome =
  | { ok: true; status: ParticipantStatus }
  | { ok: false; reason: "없음" | "지난투어" | "주최자" | "이미신청" };

/**
 * 참여 신청.
 *
 * 투어 행을 잠그고 처리한다 — 두 사람이 마지막 한 자리에 동시에 신청하면
 * 잠그지 않을 경우 둘 다 '확정' 이 되어 정원을 넘긴다.
 *
 * 선착순이면 자리가 있을 때 바로 '확정', 없으면 '대기'.
 * 승인제면 자리와 무관하게 '신청' 으로 두고 주최자가 확정한다.
 */
export async function joinTour(tourId: number, userId: number): Promise<JoinOutcome> {
  const out = await transaction(async (conn): Promise<JoinOutcome> => {
    const [tours] = await conn.query<
      (RowDataPacket & {
        host_id: number;
        capacity: number;
        join_mode: Tour["joinMode"];
        is_over: number;
      })[]
    >(
      `SELECT host_id, capacity, join_mode, (end_date < CURDATE()) AS is_over
         FROM tours WHERE id = ? FOR UPDATE`,
      [tourId],
    );
    const tour = tours[0];
    if (!tour) return { ok: false, reason: "없음" } as const;
    if (tour.host_id === userId) return { ok: false, reason: "주최자" } as const;
    if (Number(tour.is_over) === 1) return { ok: false, reason: "지난투어" } as const;

    const [mine] = await conn.query<(RowDataPacket & { status: ParticipantStatus })[]>(
      "SELECT status FROM tour_participants WHERE tour_id = ? AND user_id = ?",
      [tourId, userId],
    );
    // 취소했던 사람은 다시 신청할 수 있다 — 한 번 취소했다고 영영 못 들어오면 곤란하다
    if (mine[0] && mine[0].status !== "취소") {
      return { ok: false, reason: "이미신청" } as const;
    }

    const [counts] = await conn.query<(RowDataPacket & { n: number })[]>(
      "SELECT COUNT(*) AS n FROM tour_participants WHERE tour_id = ? AND status = '확정'",
      [tourId],
    );
    const confirmed = Number(counts[0].n);

    const status: ParticipantStatus =
      tour.join_mode === "승인제" ? "신청" : confirmed < tour.capacity ? "확정" : "대기";

    await conn.query(
      `INSERT INTO tour_participants (tour_id, user_id, status) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), joined_at = CURRENT_TIMESTAMP`,
      [tourId, userId, status],
    );

    return { ok: true, status } as const;
  });

  // 트랜잭션 밖에서 센다 — 안에서 세면 아직 커밋되지 않은 내 INSERT 를 다른 연결이 못 본다
  if (out.ok) await refreshTour(tourId);
  return out;
}

/**
 * 참여 취소.
 *
 * 행을 지우지 않고 '취소' 로 남긴다 — 누가 왔다 갔는지 주최자가 알아야 하고,
 * 다시 신청할 때 같은 행을 되살려 쓴다.
 *
 * 확정이던 사람이 빠지면 선착순 투어에서는 대기 1번이 자동으로 올라간다.
 * 승인제는 올리지 않는다 — 주최자가 보고 확정하는 게 그 방식의 전부다.
 */
export async function leaveTour(tourId: number, userId: number): Promise<boolean> {
  const left = await transaction(async (conn) => {
    const [tours] = await conn.query<
      (RowDataPacket & { join_mode: Tour["joinMode"] })[]
    >("SELECT join_mode FROM tours WHERE id = ? FOR UPDATE", [tourId]);
    if (!tours[0]) return false;

    const [mine] = await conn.query<(RowDataPacket & { status: ParticipantStatus })[]>(
      "SELECT status FROM tour_participants WHERE tour_id = ? AND user_id = ?",
      [tourId, userId],
    );
    const before = mine[0]?.status;
    if (!before || before === "취소") return false;

    await conn.query(
      "UPDATE tour_participants SET status = '취소' WHERE tour_id = ? AND user_id = ?",
      [tourId, userId],
    );

    if (before === "확정" && tours[0].join_mode === "선착순") {
      // 가장 먼저 기다린 사람부터
      await conn.query(
        `UPDATE tour_participants SET status = '확정'
          WHERE tour_id = ? AND status = '대기'
          ORDER BY joined_at, user_id LIMIT 1`,
        [tourId],
      );
    }
    return true;
  });

  if (left) await refreshTour(tourId);
  return left;
}

export type SetStatusOutcome =
  | { ok: true }
  | { ok: false; reason: "없음" | "정원초과" };

/**
 * 주최자가 참가자 상태를 바꾼다 (승인제에서 확정·거절).
 *
 * 정원을 넘겨 확정할 수는 없다 — 주최자가 실수로 넘기면 현장에서 누군가는 못 들어간다.
 */
export async function setParticipantStatus(
  tourId: number,
  userId: number,
  status: ParticipantStatus,
): Promise<SetStatusOutcome> {
  const out = await transaction(async (conn): Promise<SetStatusOutcome> => {
    const [tours] = await conn.query<(RowDataPacket & { capacity: number })[]>(
      "SELECT capacity FROM tours WHERE id = ? FOR UPDATE",
      [tourId],
    );
    if (!tours[0]) return { ok: false, reason: "없음" } as const;

    const [mine] = await conn.query<(RowDataPacket & { status: ParticipantStatus })[]>(
      "SELECT status FROM tour_participants WHERE tour_id = ? AND user_id = ?",
      [tourId, userId],
    );
    if (!mine[0]) return { ok: false, reason: "없음" } as const;

    if (status === "확정" && mine[0].status !== "확정") {
      const [counts] = await conn.query<(RowDataPacket & { n: number })[]>(
        "SELECT COUNT(*) AS n FROM tour_participants WHERE tour_id = ? AND status = '확정'",
        [tourId],
      );
      if (Number(counts[0].n) >= tours[0].capacity) {
        return { ok: false, reason: "정원초과" } as const;
      }
    }

    await conn.query(
      "UPDATE tour_participants SET status = ? WHERE tour_id = ? AND user_id = ?",
      [status, tourId, userId],
    );
    return { ok: true } as const;
  });

  if (out.ok) await refreshTour(tourId);
  return out;
}

/** 내가 신청한 투어 (취소한 것 제외) */
export async function listMyTours(userId: number): Promise<Tour[]> {
  const rows = await query<TourRow>(
    `SELECT t.* FROM tours t
       JOIN tour_participants p ON p.tour_id = t.id AND p.user_id = ? AND p.status <> '취소'
      ORDER BY t.start_date DESC, t.id DESC`,
    [userId],
  );
  return rows.map(toTour);
}
