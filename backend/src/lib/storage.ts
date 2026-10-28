// 업로드 파일 저장소.
//
// 두 가지 구현을 둔다:
//   - s3    : AWS 키가 있으면 사용 (운영)
//   - local : 없으면 디스크에 저장 (AWS 없이도 개발이 되게)
//
// **저장되는 건 "키"뿐이다** (`2026/10/abc.webp`).
// 전체 URL 은 읽을 때 IMAGE_BASE_URL 을 붙여 만든다 — CDN 도메인이 바뀌어도
// 본문 데이터를 건드릴 필요가 없다.
import { createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "uploads");

/** 로컬 저장소일 때 정적 서빙 prefix */
export const LOCAL_URL_PREFIX = "/uploads/";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export const isAllowedImage = (mimetype: string) => mimetype in IMAGE_EXT;
export const allowedImageTypes = () => Object.keys(IMAGE_EXT);
export const extFor = (mimetype: string) => IMAGE_EXT[mimetype] ?? "bin";

export interface StoredObject {
  /** DB·본문에 저장할 값 — 도메인 없는 경로 */
  key: string;
}

export interface StorageUsage {
  files: number;
  bytes: number;
}

export interface Storage {
  readonly kind: "s3" | "local";
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  /** 저장된 파일을 다시 읽는다. 없으면 null — 글 등록 시 썸네일을 만들 때 쓴다 */
  get(key: string): Promise<Buffer | null>;
  /** 여러 키를 지운다. 없는 키는 조용히 넘어간다 */
  remove(keys: string[]): Promise<void>;
  /**
   * 저장된 파일 수·용량.
   *
   * TODO: uploads 테이블에 기록을 남기면 거기서 집계하는 게 낫다 —
   *       파일이 많아지면 목록 조회가 느려진다.
   */
  usage(): Promise<StorageUsage>;
}

// ---------------------------------------------------------------------------

function createS3Storage(bucket: string, region: string): Storage {
  // 자격증명은 환경변수(AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)에서 SDK 가 자동으로 읽는다
  const client = new S3Client({ region });

  return {
    kind: "s3",
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // CDN 이 앞에 있으므로 길게 캐시한다 — 키에 UUID 가 있어 내용이 바뀌지 않는다
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      return { key };
    },
    async get(key) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!res.Body) return null;
        return Buffer.from(await res.Body.transformToByteArray());
      } catch {
        // 없는 키(NoSuchKey)도 예외로 온다 — 호출 쪽은 "없음" 으로만 알면 된다
        return null;
      }
    },
    async remove(keys) {
      // DeleteObjects 는 한 번에 1000개까지
      for (let i = 0; i < keys.length; i += 1000) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
          }),
        );
      }
    },
    async usage() {
      let files = 0;
      let bytes = 0;
      let token: string | undefined;
      do {
        const res = await client.send(
          new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
        );
        for (const o of res.Contents ?? []) {
          files++;
          bytes += o.Size ?? 0;
        }
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (token);
      return { files, bytes };
    },
  };
}

function createLocalStorage(): Storage {
  return {
    kind: "local",
    async put(key, body) {
      const target = path.join(UPLOAD_DIR, key);
      await mkdir(path.dirname(target), { recursive: true });
      await new Promise<void>((resolve, reject) => {
        const stream = createWriteStream(target);
        stream.on("error", (err) => {
          void unlink(target).catch(() => {});
          reject(err);
        });
        stream.on("finish", () => resolve());
        stream.end(body);
      });
      return { key };
    },
    async get(key) {
      try {
        return await readFile(path.join(UPLOAD_DIR, key));
      } catch {
        return null;
      }
    },
    async remove(keys) {
      for (const key of keys) {
        // 이미 없는 파일은 무시한다 — 재실행해도 실패하지 않게
        await unlink(path.join(UPLOAD_DIR, key)).catch(() => {});
      }
    },
    async usage() {
      const walk = async (dir: string): Promise<StorageUsage> => {
        let files = 0;
        let bytes = 0;
        let entries;
        try {
          entries = await readdir(dir, { withFileTypes: true });
        } catch {
          return { files, bytes }; // 폴더가 아직 없으면 0
        }
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const sub = await walk(full);
            files += sub.files;
            bytes += sub.bytes;
          } else {
            files++;
            bytes += (await stat(full)).size;
          }
        }
        return { files, bytes };
      };
      return walk(UPLOAD_DIR);
    },
  };
}

let cached: Storage | undefined;

export function getStorage(): Storage {
  if (cached) return cached;

  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION;
  const hasCreds = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

  cached = bucket && region && hasCreds ? createS3Storage(bucket, region) : createLocalStorage();
  return cached;
}

/** 테스트에서 저장소를 갈아끼울 때 */
export function resetStorage() {
  cached = undefined;
}

// ---------------------------------------------------------------------------

/**
 * 저장 키 생성 — `2026/10/12/<uuid>_<variant>.webp`
 *
 * 연·월·일로 나눠 한 경로에 파일이 몰리지 않게 한다.
 * 예전 파일은 `2026/10/...` (일 없음) 로 남아 있는데, 경로가 DB 에 통째로 저장되므로
 * 섞여 있어도 문제되지 않는다. 바꾸는 건 새로 올라오는 파일뿐이다.
 */
export function makeKey(id: string, variant: string, ext: string, at = new Date()) {
  const yyyy = String(at.getFullYear());
  const mm = String(at.getMonth() + 1).padStart(2, "0");
  const dd = String(at.getDate()).padStart(2, "0");
  const suffix = variant === "view" ? "" : `_${variant}`;
  return `${yyyy}/${mm}/${dd}/${id}${suffix}.${ext}`;
}

export const newUploadId = () => randomUUID();

/**
 * 키 → 공개 URL.
 *
 * S3/CloudFront 면 IMAGE_BASE_URL 을 붙이고, 로컬이면 /uploads/ 로 서빙한다.
 * 본문(content_json)에는 키만 저장하고, 읽기용 HTML 을 만들 때 이 함수로 URL 을 만든다.
 */
export function publicUrl(key: string): string {
  const base = process.env.IMAGE_BASE_URL?.replace(/\/+$/, "");
  if (base) return `${base}/${key}`;
  return `${LOCAL_URL_PREFIX}${key}`;
}

/** 본문에 저장할 값 — 앞에 `/` 를 붙여 상대경로로 둔다 */
export const toStoredPath = (key: string) => `/${key}`;

/** 저장된 값(`/2026/10/x.webp`) → 키(`2026/10/x.webp`) */
export const toKey = (stored: string) => stored.replace(/^\/+/, "");

/**
 * 본문용 경로 → 썸네일 경로. (`/2026/10/x.webp` → `/2026/10/x_thumb.webp`)
 *
 * 파생본 이름이 규칙적이라 경로만으로 만들 수 있다.
 * webp 가 아닌 건 파생본을 안 만든 경우(애니메이션 GIF)라 원본을 그대로 쓴다.
 */
export function toThumbPath(stored: string): string {
  if (!stored.endsWith(".webp")) return stored;
  if (stored.includes("_thumb.") || stored.includes("_archive.")) return stored;
  return stored.replace(/\.webp$/, "_thumb.webp");
}

/**
 * 전체 URL 을 저장용 경로로 되돌린다.
 *
 * 업로드 응답은 에디터가 바로 띄울 수 있게 전체 URL 을 주지만,
 * 본문에 저장할 때는 도메인을 떼어낸다 — CDN 도메인이 바뀌어도 본문이 안 깨지게.
 * 우리 CDN/로컬 주소가 아니면 외부 이미지이므로 그대로 둔다.
 */
export function toRelativeIfOurs(src: string): string {
  const base = process.env.IMAGE_BASE_URL?.replace(/\/+$/, "");
  if (base && src.startsWith(base + "/")) return src.slice(base.length);
  if (src.startsWith(LOCAL_URL_PREFIX)) return "/" + src.slice(LOCAL_URL_PREFIX.length);
  return src;
}
