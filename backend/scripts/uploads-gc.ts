// 고아 이미지 청소 — 어느 글에도 안 쓰인 채 방치된 업로드를 지운다.
//
//   npm run uploads:gc              무엇을 지울지 보여주기만 (dry-run)
//   npm run uploads:gc -- --yes     실제 삭제
//   npm run uploads:gc -- --hours 48 --yes
//   npm run uploads:gc -- --reconcile   기록에 없는 저장소 파일까지 점검
//
// 글을 쓰다 만 사람의 이미지를 지우면 안 되므로 기본 24시간 유예를 둔다.
import "dotenv/config";
import { getStorage, toKey } from "../src/lib/storage.js";
import { closePool } from "../src/db/pool.js";
import { deleteUploadRecords, findOrphans, listAllPaths } from "../src/repositories/uploads.js";

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const reconcile = args.includes("--reconcile");
const hoursArg = args.indexOf("--hours");
const hours = hoursArg >= 0 ? Number(args[hoursArg + 1]) : 24;

if (!Number.isFinite(hours) || hours < 0) {
  console.error("❌ --hours 는 0 이상의 숫자여야 합니다.");
  process.exit(1);
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

async function main() {
  const storage = getStorage();
  console.log(`저장소: ${storage.kind} / 유예: ${hours}시간\n`);

  const orphans = await findOrphans(hours);

  if (orphans.length === 0) {
    console.log("청소할 고아 이미지가 없습니다.");
  } else {
    const bytes = orphans.reduce((sum, o) => sum + o.bytes, 0);
    const paths = orphans.flatMap((o) => o.paths);
    console.log(`고아 업로드 ${orphans.length}건 / 파일 ${paths.length}개 / ${kb(bytes)}`);
    for (const o of orphans) {
      console.log(`  ${o.createdAt}  ${o.id}  (파일 ${o.paths.length}개)`);
    }

    if (confirmed) {
      await storage.remove(paths.map(toKey));
      const removed = await deleteUploadRecords(orphans.map((o) => o.id));
      console.log(`\n✅ 파일 ${paths.length}개 삭제, 기록 ${removed}건 삭제`);
    } else {
      console.log("\n실제로 지우려면 --yes 를 붙이세요.");
    }
  }

  // 기록에 없는 저장소 파일 — 기록 도입 전에 올라갔거나 중간에 실패한 것들
  if (reconcile) {
    console.log("\n--- 저장소 대조 ---");
    const known = await listAllPaths();
    const usage = await storage.usage();
    console.log(`저장소 파일 ${usage.files}개 / ${kb(usage.bytes)}`);
    console.log(`기록된 경로 ${known.size}개`);
    if (usage.files > known.size) {
      console.log(
        `⚠️  기록에 없는 파일이 ${usage.files - known.size}개 있습니다.\n` +
          "   기록 도입 전에 올라간 파일이거나, 업로드 도중 실패한 흔적입니다.\n" +
          "   `npx tsx scripts/s3-list.ts` 로 확인한 뒤 수동으로 정리하세요.",
      );
    } else {
      console.log("✅ 저장소와 기록이 일치합니다.");
    }
  }
}

try {
  await main();
} finally {
  await closePool();
}
