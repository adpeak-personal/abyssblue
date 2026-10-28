// MySQL 커넥션 풀 — 앱 전체에서 하나만 쓴다.
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { describeTarget, getDbConfig } from "./config.js";

/**
 * DB 에 저장·조회되는 시각의 기준 타임존.
 *
 * 운영·테스트·로컬 전부 KST 다. DATETIME 컬럼에는 오프셋이 없으므로,
 * 읽을 때도 같은 값을 붙여 줘야 클라이언트가 9시간 밀려 해석하지 않는다.
 */
export const DB_TIMEZONE = "+09:00";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (pool) return pool;
  pool = mysql.createPool({
    ...getDbConfig(),
    waitForConnections: true,
    connectionLimit: 10,
    // DATETIME 을 JS Date 가 아니라 문자열로 받는다.
    // 드라이버가 Date 로 바꾸면 서버 로컬 타임존이 끼어들어 날짜가 밀린다 —
    // 도메인 타입이 ISO 문자열이라 문자열 그대로 다루는 편이 안전하다.
    dateStrings: true,
    // 연결 타임존을 못 박는다.
    // 기본값(SYSTEM)이면 MySQL 이 깔린 서버의 설정을 따라가서, 같은 코드가 환경마다
    // 다른 시각을 저장한다. 이 서비스는 어디서 돌든 KST 기준이다.
    timezone: DB_TIMEZONE,
    // 스키마가 utf8mb4 라 한글이 깨지지 않게 맞춘다
    charset: "utf8mb4",
  });
  return pool;
}

export async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}

/** 시작 시 접속 확인 — 실패하면 무엇이 잘못됐는지 바로 알 수 있게 */
export async function verifyConnection() {
  const conn = await getPool().getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
  return describeTarget(getDbConfig());
}

/** SELECT 헬퍼 — 결과 행 타입을 지정해 쓴다 */
export async function query<T extends RowDataPacket>(sql: string, params: unknown[] = []) {
  const [rows] = await getPool().query<T[]>(sql, params);
  return rows;
}

/** 한 행만 (없으면 undefined) */
export async function queryOne<T extends RowDataPacket>(sql: string, params: unknown[] = []) {
  const rows = await query<T>(sql, params);
  return rows[0];
}

/** INSERT/UPDATE/DELETE — insertId 와 변경 행 수를 돌려준다 */
export async function execute(sql: string, params: unknown[] = []) {
  const [result] = await getPool().execute(sql, params as never);
  const r = result as { insertId: number; affectedRows: number };
  return { insertId: r.insertId, affectedRows: r.affectedRows };
}

/** 여러 쿼리를 한 트랜잭션으로 */
export async function transaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
