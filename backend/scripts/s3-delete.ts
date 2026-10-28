// S3 객체 삭제 — 되돌릴 수 없으므로 기본은 "무엇을 지울지 보여주기만" 한다.
//
//   npx tsx scripts/s3-delete.ts <prefix>            목록만 (dry-run)
//   npx tsx scripts/s3-delete.ts <prefix> --yes      실제 삭제
import "dotenv/config";
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const bucket = process.env.S3_BUCKET;
const region = process.env.AWS_REGION;
if (!bucket || !region) {
  console.error("❌ S3_BUCKET / AWS_REGION 이 없습니다.");
  process.exit(1);
}

const prefix = process.argv[2];
const confirmed = process.argv.includes("--yes");

if (!prefix) {
  console.error("❌ prefix 를 지정하세요. 버킷 전체를 실수로 지우지 않기 위한 안전장치입니다.");
  console.error("   예: npx tsx scripts/s3-delete.ts 2026/10/ --yes");
  process.exit(1);
}

const client = new S3Client({ region });

const keys: string[] = [];
let token: string | undefined;
do {
  const res = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
  );
  for (const o of res.Contents ?? []) if (o.Key) keys.push(o.Key);
  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);

if (keys.length === 0) {
  console.log(`대상 없음 (prefix: ${prefix})`);
  process.exit(0);
}

console.log(`버킷 ${bucket}\nprefix "${prefix}" 에 ${keys.length}개:`);
for (const k of keys) console.log("  " + k);

if (!confirmed) {
  console.log("\n실제로 지우려면 --yes 를 붙이세요. (되돌릴 수 없습니다)");
  process.exit(0);
}

// DeleteObjects 는 한 번에 1000개까지
let deleted = 0;
for (let i = 0; i < keys.length; i += 1000) {
  const chunk = keys.slice(i, i + 1000);
  const res = await client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
    }),
  );
  deleted += chunk.length - (res.Errors?.length ?? 0);
  for (const e of res.Errors ?? []) console.error(`  ❌ ${e.Key}: ${e.Message}`);
}

console.log(`\n✅ ${deleted}개 삭제`);
