// S3 버킷 객체 목록 — 정리 전 확인용.
//
//   npx tsx scripts/s3-list.ts [prefix]
import "dotenv/config";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const bucket = process.env.S3_BUCKET;
const region = process.env.AWS_REGION;
if (!bucket || !region) {
  console.error("❌ S3_BUCKET / AWS_REGION 이 없습니다.");
  process.exit(1);
}

const prefix = process.argv[2] ?? "";
const client = new S3Client({ region });

let token: string | undefined;
let count = 0;
let bytes = 0;

console.log(`버킷: ${bucket}${prefix ? ` (prefix: ${prefix})` : ""}\n`);

do {
  const res = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
  );
  for (const o of res.Contents ?? []) {
    count++;
    bytes += o.Size ?? 0;
    console.log(`  ${o.LastModified?.toISOString().slice(0, 16)}  ${String(o.Size).padStart(8)}B  ${o.Key}`);
  }
  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);

console.log(`\n총 ${count}개 / ${(bytes / 1024).toFixed(1)} KB`);
