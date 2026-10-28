// 시드로 넣은 가짜 회원을 정리한다.
//
//   npm run members:clear -- --keep 1,13          무엇이 지워지는지 보기만
//   npm run members:clear -- --keep 1,13 --yes    실제 삭제
//
// 회원을 지우면 그 사람에게 걸린 것들이 함께 사라진다. 무엇이 걸려 있는지 먼저 보여주고,
// 글이나 댓글이 걸려 있으면 **거부한다** — 그건 가짜 데이터가 아닐 가능성이 크고,
// 지우면 남의 글이 통째로 날아간다.
//
// ⚠️ 되돌릴 수 없다. backups/ 에 받아 두지만 복구는 수작업이다.
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RowDataPacket } from "mysql2";
import { closePool, execute, query } from "../src/db/pool.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(here, "../backups");

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const keepArg = args[args.indexOf("--keep") + 1];
const keep = (args.includes("--keep") ? (keepArg ?? "") : "")
  .split(",")
  .map((n) => Number(n.trim()))
  .filter((n) => Number.isInteger(n) && n > 0);

if (keep.length === 0) {
  console.error("❌ 남길 회원을 지정하세요.  예) npm run members:clear -- --keep 1,13");
  console.error("   (운영진 계정까지 지우면 어드민에 아무도 못 들어갑니다)");
  process.exit(1);
}

const KEEP = `(${keep.join(",")})`;

interface Row extends RowDataPacket {
  [key: string]: unknown;
}

async function main() {
  const targets = await query<Row>(
    `SELECT id, nickname, email, level FROM users WHERE id NOT IN ${KEEP} ORDER BY id`,
  );

  if (targets.length === 0) {
    console.log("✅ 지울 회원이 없습니다.");
    return;
  }

  console.log(`■ 지울 회원 ${targets.length}명`);
  console.table(targets);

  // 글·댓글이 걸려 있으면 가짜 데이터가 아닐 수 있다 — 사람이 먼저 확인해야 한다
  const [blocking] = await query<Row & { posts: number; comments: number }>(
    `SELECT (SELECT COUNT(*) FROM posts    WHERE author_id NOT IN ${KEEP}) AS posts,
            (SELECT COUNT(*) FROM comments WHERE author_id NOT IN ${KEEP}) AS comments`,
  );
  if (Number(blocking.posts) > 0 || Number(blocking.comments) > 0) {
    console.error(
      `\n❌ 글 ${blocking.posts}건 · 댓글 ${blocking.comments}건이 이 회원들 것입니다.\n` +
        "   먼저 해당 게시판을 비우거나(npm run board:clear), 남길 회원에 추가하세요.",
    );
    process.exit(1);
  }

  const [counts] = await query<Row>(
    `SELECT (SELECT COUNT(*) FROM dive_logs WHERE user_id NOT IN ${KEEP}) AS logs,
            (SELECT COUNT(*) FROM tours     WHERE host_id NOT IN ${KEEP}) AS tours`,
  );
  console.log(`  함께 삭제: 다이브 로그 ${counts.logs}건 / 투어 ${counts.tours}건`);

  if (!confirmed) {
    console.log(`\n실제로 지우려면: npm run members:clear -- --keep ${keep.join(",")} --yes`);
    return;
  }

  // 지우기 전에 받아 둔다
  const [users, logs, tours] = await Promise.all([
    query<Row>(`SELECT * FROM users WHERE id NOT IN ${KEEP}`),
    query<Row>(`SELECT * FROM dive_logs WHERE user_id NOT IN ${KEEP}`),
    query<Row>(`SELECT * FROM tours WHERE host_id NOT IN ${KEEP}`),
  ]);
  await mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = path.join(BACKUP_DIR, `members-${stamp}.json`);
  await writeFile(file, JSON.stringify({ users, logs, tours }, null, 2), "utf8");
  console.log(`\n  백업: ${path.relative(process.cwd(), file)}`);

  // 투어는 주최자를 RESTRICT 로 참조한다 — 회원보다 먼저 지워야 한다.
  // 로그·참가 기록은 CASCADE 라 회원과 함께 사라진다.
  const t = await execute(`DELETE FROM tours WHERE host_id NOT IN ${KEEP}`);
  console.log(`  ✔ 투어 ${t.affectedRows}건`);

  const u = await execute(`DELETE FROM users WHERE id NOT IN ${KEEP}`);
  console.log(`  ✔ 회원 ${u.affectedRows}명 (로그·좋아요·알림 등 함께 삭제)`);

  console.log("\n✅ 완료");
}

try {
  await main();
} finally {
  await closePool();
}
