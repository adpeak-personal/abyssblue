// 기존 글의 썸네일 경로를 새 방식에 맞춘다.
//
//   npm run thumbs:backfill          무엇이 바뀌는지 보기만
//   npm run thumbs:backfill -- --yes 실제 적용
//
// 예전에는 posts.thumbnail_url 에 본문용 이미지 경로를 넣고, 읽을 때 `_thumb` 규칙으로
// 바꿔서 내보냈다. 이제는 저장된 값이 곧 실제로 있는 파일이다.
// 그래서 기존 글은 ① 썸네일이 있으면 그 경로로 바꾸고 ② 없으면 지금 만들어 준다.
import "dotenv/config";
import type { RowDataPacket } from "mysql2";
import { closePool, execute, query } from "../src/db/pool.js";
import { ensureThumbnail } from "../src/lib/thumbnail.js";
import { getStorage } from "../src/lib/storage.js";

const confirmed = process.argv.includes("--yes");

interface Row extends RowDataPacket {
  id: number;
  title: string;
  thumbnail_url: string;
}

async function main() {
  console.log(`저장소: ${getStorage().kind}\n`);

  const rows = await query<Row>(
    `SELECT id, title, thumbnail_url
       FROM posts
      WHERE thumbnail_url IS NOT NULL
        AND thumbnail_url <> ''
        AND thumbnail_url NOT LIKE '%\\_thumb.%'
      ORDER BY id`,
  );

  if (rows.length === 0) {
    console.log("✅ 모든 글이 이미 썸네일 경로를 가리키고 있습니다.");
    return;
  }

  console.log(`대상 ${rows.length}건\n`);
  if (!confirmed) {
    for (const r of rows.slice(0, 15)) {
      console.log(`  #${r.id} ${r.title.slice(0, 28)}`);
      console.log(`       ${r.thumbnail_url}`);
    }
    if (rows.length > 15) console.log(`  … 외 ${rows.length - 15}건`);
    console.log("\n실제로 적용하려면: npm run thumbs:backfill -- --yes");
    return;
  }

  let changed = 0;
  let missing = 0;

  for (const r of rows) {
    // 있으면 그 경로를, 없으면 만들어서 돌려준다
    const next = await ensureThumbnail(r.thumbnail_url);
    if (next === r.thumbnail_url) {
      // 원본조차 없는 경우 — 저장소에서 지워졌거나 외부 이미지
      missing++;
      console.log(`  ⚠ #${r.id} 썸네일을 만들지 못했습니다 (${r.thumbnail_url})`);
      continue;
    }
    await execute("UPDATE posts SET thumbnail_url = ? WHERE id = ?", [next, r.id]);
    changed++;
  }

  console.log(`\n✅ ${changed}건 갱신${missing ? `, ${missing}건은 원본을 찾지 못해 그대로 둠` : ""}`);
}

try {
  await main();
} finally {
  await closePool();
}
