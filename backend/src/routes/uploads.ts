import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { UnsupportedImageError, isAnimated, processImage } from "../lib/images.js";
import {
  MAX_IMAGE_BYTES,
  allowedImageTypes,
  extFor,
  getStorage,
  isAllowedImage,
  makeKey,
  newUploadId,
  publicUrl,
} from "../lib/storage.js";
import { findBoardBySlug } from "../repositories/boards.js";
import { recordUpload } from "../repositories/uploads.js";
import { toRelativeIfOurs } from "../lib/storage.js";

const querySchema = z.object({
  /** 어느 게시판에 쓸 이미지인지 — 화질 정책을 서버가 정하기 위해 받는다 */
  boardSlug: z.string().min(1).optional(),
});

/** 스트림을 버퍼로 — sharp 가 전체 바이트를 필요로 한다 */
async function readAll(stream: AsyncIterable<Buffer>, limit: number) {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.byteLength;
    if (total > limit) return null; // 초과분은 더 읽지 않는다
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  /**
   * 에디터·사진 업로더 이미지 업로드 — multipart/form-data, 필드명 `file`
   *
   * 크기별 파생본(썸네일/본문용/보관본)을 만들고 EXIF 를 제거한 뒤 저장한다.
   * 응답의 `url` 은 도메인 없는 경로다 — 전체 주소는 읽을 때 조립한다.
   */
  // 로그인 필수 — 열어두면 누구나 S3 용량을 채울 수 있다
  app.post("/uploads/image", { onRequest: app.requireAuth }, async (req, reply) => {
    const { boardSlug } = querySchema.parse(req.query);

    // 화질 정책은 서버가 정한다 — 클라이언트가 보낸 값을 믿으면 누구나 고화질로 올릴 수 있다
    const board = boardSlug ? await findBoardBySlug(boardSlug) : undefined;
    const highQuality = board?.highQuality === true;

    const data = await req.file();
    if (!data) return reply.code(400).send({ message: "업로드할 파일이 없습니다." });

    if (!isAllowedImage(data.mimetype)) {
      return reply.code(415).send({
        message: `지원하지 않는 이미지 형식입니다. (${allowedImageTypes().join(", ")})`,
      });
    }

    const input = await readAll(data.file, MAX_IMAGE_BYTES);
    if (!input || data.file.truncated) {
      return reply.code(413).send({
        message: `이미지는 ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB 이하만 업로드할 수 있습니다.`,
      });
    }

    const storage = getStorage();
    const id = newUploadId();

    // 애니메이션 GIF 는 webp 로 바꾸면 첫 프레임만 남는다 — 원본 그대로 저장
    if (await isAnimated(input)) {
      const key = makeKey(id, "view", extFor(data.mimetype));
      await storage.put(key, input, data.mimetype);
      await recordUpload({
        id,
        uploaderId: req.authUser!.id,
        url: `/${key}`,
        mime: data.mimetype,
        bytes: input.byteLength,
      });
      return reply.code(201).send({
        url: publicUrl(key),
        thumbUrl: publicUrl(key),
        filename: data.filename,
        mimetype: data.mimetype,
        size: input.byteLength,
        animated: true,
      });
    }

    let processed;
    try {
      processed = await processImage(input, highQuality);
    } catch (err) {
      if (err instanceof UnsupportedImageError) {
        return reply.code(400).send({ message: err.message });
      }
      throw err;
    }

    const stored: Record<string, string> = {};
    let bytes = 0;
    for (const image of processed.images) {
      const key = makeKey(id, image.variant, "webp");
      await storage.put(key, image.body, "image/webp");
      // 에디터가 바로 띄울 수 있게 전체 URL 로 돌려준다 — 저장 시 서버가 경로로 되돌린다
      stored[image.variant] = publicUrl(key);
      bytes += image.bytes;
    }

    const view = processed.images.find((i) => i.variant === "view");

    // post_id 없이 기록해 둔다 — 글에 안 쓰이면 나중에 청소 대상이 된다
    await recordUpload({
      id,
      uploaderId: req.authUser!.id,
      url: toRelativeIfOurs(stored.view),
      // 썸네일은 글을 등록할 때 첫 이미지에만 만든다 — 여기서는 비워 둔다

      archiveUrl: stored.archive ? toRelativeIfOurs(stored.archive) : undefined,
      mime: "image/webp",
      bytes,
      width: view?.width,
      height: view?.height,
    });

    return reply.code(201).send({
      url: stored.view,
      archiveUrl: stored.archive,
      filename: data.filename,
      mimetype: "image/webp",
      size: bytes,
      width: view?.width,
      height: view?.height,
      /** 원본 대비 얼마나 줄었는지 — 로그·디버깅용 */
      sourceBytes: input.byteLength,
    });
  });
};
