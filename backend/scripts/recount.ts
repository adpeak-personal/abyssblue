// 캐시해 둔 집계를 실제 값으로 다시 맞춘다.
//
//   npm run db:recount           어긋난 곳만 보여주기
//   npm run db:recount -- --yes  실제로 맞추기
//
// posts.comment_count / posts.likes / comments.likes 는 매번 세지 않으려고
// 캐시해 둔 숫자다. 시드 데이터가 mock 의 가짜 값을 그대로 넣어서 실제와 어긋나 있고,
// 혹시 집계 갱신이 빠지는 버그가 생겨도 이걸로 되돌릴 수 있다.
import "dotenv/config";
import type { RowDataPacket } from "mysql2";
import { closePool, execute, query } from "../src/db/pool.js";

const confirmed = process.argv.includes("--yes");

interface Diff extends RowDataPacket {
  id: number;
  title?: string;
  saved: number;
  actual: number;
}

interface Target {
  label: string;
  /** 어긋난 행 찾기 */
  find: string;
  /** 전부 다시 계산 */
  fix: string;
}

const targets: Target[] = [
  {
    label: "posts.comment_count",
    find: `SELECT p.id, LEFT(p.title, 24) AS title, p.comment_count AS saved,
                  (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS actual
             FROM posts p
            WHERE p.deleted_at IS NULL
           HAVING saved <> actual
            ORDER BY p.id`,
    fix: `UPDATE posts p
             SET p.comment_count =
                 (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL)`,
  },
  {
    label: "posts.likes",
    find: `SELECT p.id, LEFT(p.title, 24) AS title, p.likes AS saved,
                  (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) AS actual
             FROM posts p
            WHERE p.deleted_at IS NULL
           HAVING saved <> actual
            ORDER BY p.id`,
    fix: `UPDATE posts p SET p.likes = (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id)`,
  },
  {
    label: "comments.likes",
    find: `SELECT c.id, LEFT(c.content, 24) AS title, c.likes AS saved,
                  (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) AS actual
             FROM comments c
            WHERE c.deleted_at IS NULL
           HAVING saved <> actual
            ORDER BY c.id`,
    fix: `UPDATE comments c
             SET c.likes = (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id)`,
  },
];

async function main() {
  let total = 0;

  for (const t of targets) {
    const rows = await query<Diff>(t.find);
    if (rows.length === 0) {
      console.log(`✔ ${t.label} — 맞습니다`);
      continue;
    }

    total += rows.length;
    console.log(`\n■ ${t.label} — ${rows.length}건 어긋남`);
    console.table(
      rows.slice(0, 12).map((r) => ({
        id: r.id,
        대상: r.title ?? "",
        저장된값: Number(r.saved),
        실제: Number(r.actual),
      })),
    );
    if (rows.length > 12) console.log(`  … 외 ${rows.length - 12}건`);
  }

  if (total === 0) {
    console.log("\n✅ 모든 집계가 실제 값과 일치합니다.");
    return;
  }

  if (!confirmed) {
    console.log("\n실제로 맞추려면: npm run db:recount -- --yes");
    return;
  }

  console.log("");
  for (const t of targets) {
    const { affectedRows } = await execute(t.fix);
    console.log(`  ✔ ${t.label} — ${affectedRows}행 갱신`);
  }
  console.log("\n✅ 완료");
}

try {
  await main();
} finally {
  await closePool();
}
