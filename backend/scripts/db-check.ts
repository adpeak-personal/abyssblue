// DB 연결 확인 — .env 설정으로 접속해 스키마가 제대로 올라갔는지 본다.
//
//   npm run db:check
//
// 비밀번호는 .env 에만 있고 출력에는 찍지 않는다.
import "dotenv/config";
import mysql from "mysql2/promise";
import { DbConfigError, describeTarget, getDbConfig } from "../src/db/config.js";

/** 오늘 작업이 스키마에 반영됐는지 — 빠지면 저장 시 조용히 잘린다 */
const REQUIRED: Record<string, string[]> = {
  posts: ["content", "content_json", "content_html", "thumbnail_url", "image_count"],
  boards: ["type", "write_mode", "high_quality", "categories"],
  uploads: ["id", "post_id", "url", "thumb_url", "archive_url"],
};

let config;
try {
  config = getDbConfig();
} catch (err) {
  console.error("❌ " + (err instanceof DbConfigError ? err.message : String(err)));
  process.exit(1);
}

let conn;
try {
  conn = await mysql.createConnection(config);
} catch (err) {
  console.error(`❌ 접속 실패 — ${describeTarget(config)}`);
  console.error("   " + (err as Error).message);
  process.exit(1);
}

console.log(`✅ 접속 성공 — ${describeTarget(config)}`);

const [tables] = await conn.query<any[]>("SHOW TABLES");
const names = tables.map((r) => Object.values(r)[0] as string).sort();
console.log(`\n테이블 ${names.length}개: ${names.join(", ")}`);

let missing = 0;
for (const [table, columns] of Object.entries(REQUIRED)) {
  if (!names.includes(table)) {
    console.error(`❌ 테이블 없음: ${table}`);
    missing++;
    continue;
  }
  const [cols] = await conn.query<any[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [table],
  );
  const have = new Set(cols.map((c) => c.COLUMN_NAME));
  const lack = columns.filter((c) => !have.has(c));
  if (lack.length) {
    console.error(`❌ ${table}: 컬럼 없음 → ${lack.join(", ")}`);
    missing += lack.length;
  } else {
    console.log(`✅ ${table}: 필요한 컬럼 모두 있음`);
  }
}

if (names.includes("boards")) {
  const [boards] = await conn.query<any[]>(
    "SELECT slug, type, write_mode, high_quality FROM boards ORDER BY id",
  );
  if (boards.length === 0) {
    console.log("\n⚠️  boards 가 비어 있습니다 — seed.sql 이 아직 안 들어갔습니다.");
  } else {
    console.log("\n게시판 설정:");
    for (const b of boards) {
      console.log(
        `  ${String(b.slug).padEnd(10)} ${String(b.type).padEnd(8)} ${String(b.write_mode).padEnd(7)} ${b.high_quality ? "고화질" : ""}`,
      );
    }
  }
}

await conn.end();

if (missing) {
  console.error(`\n❌ ${missing}개 누락 — schema.sql 을 다시 적용해야 합니다.`);
  process.exit(1);
}
console.log("\n✅ 스키마 확인 완료");
