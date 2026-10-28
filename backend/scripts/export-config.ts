// 설정 데이터를 SQL 로 뽑는다 — 새 환경(운영 DB)을 세팅할 때 쓴다.
//
//   npm run db:export-config
//
// 뽑는 건 "운영진이 정하는 값"뿐이다 — 게시판 구조와 다이브 포인트.
// 회원·글·댓글·업로드는 각 환경의 것이므로 넣지 않는다.
//
// 결과: deploy/seed-config.sql  (schema.sql 을 적용한 뒤에 넣는다)
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";
import { closePool, query } from "../src/db/pool.js";

/** 부모를 먼저 넣어야 외래키가 걸리지 않는다 */
const TABLES = ["board_groups", "boards", "dive_points", "dive_point_water_temps"];

const OUT = resolve(import.meta.dirname, "../../deploy/seed-config.sql");

/**
 * 한 칸의 값을 SQL 리터럴로.
 *
 * JSON 컬럼(`boards.categories`)은 mysql2 가 배열·객체로 돌려주는데,
 * 그걸 escape() 에 그대로 주면 값 하나가 아니라 여러 칸으로 펼쳐진다
 * (`'공지', '이벤트'` 처럼) — 컬럼 수가 안 맞아 INSERT 가 깨진다.
 */
function sqlValue(v: unknown): string {
  if (v !== null && typeof v === "object" && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    return mysql.escape(JSON.stringify(v));
  }
  return mysql.escape(v);
}

async function main() {
  const lines: string[] = [
    "-- 설정 데이터 (게시판·다이브 포인트)",
    "-- npm run db:export-config 로 만든다 — 직접 고치지 말 것",
    `-- 뽑은 시각: ${new Date().toISOString()}`,
    "--",
    "-- 적용:  mysql -u root -p abyssblue < deploy/seed-config.sql",
    "-- schema.sql 을 먼저 적용한 뒤에 넣는다.",
    "",
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS = 0;",
    "",
  ];

  for (const table of TABLES) {
    const rows = await query<never>(`SELECT * FROM \`${table}\``);
    lines.push(`-- ${table} (${rows.length}건)`);
    // 여러 번 돌려도 같은 결과가 되게 — 설정이니 통째로 바꾸는 게 맞다
    lines.push(`DELETE FROM \`${table}\`;`);

    for (const row of rows as Record<string, unknown>[]) {
      const cols = Object.keys(row);
      const vals = cols.map((c) => sqlValue(row[c]));
      lines.push(
        `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES (${vals.join(", ")});`,
      );
    }
    lines.push("");
    console.log(`  ${table.padEnd(24)} ${rows.length}건`);
  }

  lines.push("SET FOREIGN_KEY_CHECKS = 1;");
  writeFileSync(OUT, lines.join("\n") + "\n", "utf8");
  console.log(`\n→ ${OUT}`);
}

try {
  await main();
} finally {
  await closePool();
}
