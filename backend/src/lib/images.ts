// 업로드 이미지 가공 — 크기별 파생본 생성 + EXIF 제거
//
// sharp 는 기본적으로 메타데이터를 **버린다**(withMetadata() 를 부르지 않는 한).
// 그래서 GPS 좌표를 포함한 EXIF 가 자동으로 사라진다 — 다이빙 포인트 위치나
// 집에서 찍은 장터 사진의 좌표가 그대로 공개되는 걸 막기 위해 중요한 동작이다.
import sharp from "sharp";

export type ImageVariant = "thumb" | "view" | "archive";

interface VariantSpec {
  /** 긴 변 최대 픽셀 */
  maxEdge: number;
  quality: number;
}

const SPECS: Record<ImageVariant, VariantSpec> = {
  thumb: { maxEdge: 400, quality: 75 },
  view: { maxEdge: 1600, quality: 80 },
  // 사진이 콘텐츠인 게시판만 — 용량을 훨씬 많이 쓴다
  archive: { maxEdge: 2560, quality: 88 },
};

/** 고화질 게시판은 본문용도 더 크게 뽑는다 */
const HIGH_QUALITY_VIEW: VariantSpec = { maxEdge: 2048, quality: 85 };

export interface ProcessedImage {
  variant: ImageVariant;
  body: Buffer;
  width: number;
  height: number;
  bytes: number;
}

export interface ProcessResult {
  images: ProcessedImage[];
  /** 원본 크기 — 기록용 */
  source: { width: number; height: number; format: string };
}

export class UnsupportedImageError extends Error {}

/**
 * 업로드된 이미지를 webp 파생본으로 변환한다.
 *
 * - 원본보다 키우지 않는다 (withoutEnlargement)
 * - 애니메이션 GIF 는 프레임이 날아가므로 변환하지 않고 호출 쪽에서 원본을 쓴다
 */
/**
 * 업로드 시점에 만들 파생본.
 *
 * 썸네일은 여기 없다 — 목록 썸네일로 쓰이는 건 **글의 첫 이미지 하나뿐**이라,
 * 올리는 족족 만들면 나머지는 전부 버려지는 파일이 된다.
 * 글을 등록할 때 첫 이미지에 대해서만 `makeThumb` 로 만든다.
 */
export async function processImage(input: Buffer, highQuality: boolean): Promise<ProcessResult> {
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new UnsupportedImageError("이미지를 읽을 수 없습니다.");
  }
  if (!meta.width || !meta.height) {
    throw new UnsupportedImageError("이미지 크기를 확인할 수 없습니다.");
  }

  const wanted: ImageVariant[] = highQuality ? ["view", "archive"] : ["view"];

  const images: ProcessedImage[] = [];
  for (const variant of wanted) {
    const spec = variant === "view" && highQuality ? HIGH_QUALITY_VIEW : SPECS[variant];
    const body = await sharp(input)
      .rotate() // EXIF 방향만 반영하고 메타데이터 자체는 버린다
      .resize({
        width: spec.maxEdge,
        height: spec.maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: spec.quality })
      .toBuffer();

    const out = await sharp(body).metadata();
    images.push({
      variant,
      body,
      width: out.width ?? 0,
      height: out.height ?? 0,
      bytes: body.byteLength,
    });
  }

  return {
    images,
    source: { width: meta.width, height: meta.height, format: meta.format ?? "unknown" },
  };
}

/**
 * 썸네일 한 장만 만든다 — 글 등록 시 첫 이미지에 쓴다.
 *
 * 원본이 아니라 이미 저장된 본문용(view) 이미지를 줄인다. 400px 로 줄일 거라
 * 1600px 짜리로도 충분하고, 원본을 따로 보관하지 않기 때문이다.
 */
export async function makeThumb(viewImage: Buffer): Promise<ProcessedImage> {
  const spec = SPECS.thumb;
  const body = await sharp(viewImage)
    .resize({ width: spec.maxEdge, height: spec.maxEdge, fit: "inside", withoutEnlargement: true })
    .webp({ quality: spec.quality })
    .toBuffer();

  const out = await sharp(body).metadata();
  return {
    variant: "thumb",
    body,
    width: out.width ?? 0,
    height: out.height ?? 0,
    bytes: body.byteLength,
  };
}

/** 애니메이션 GIF 는 webp 변환 시 첫 프레임만 남아서 따로 다룬다 */
export async function isAnimated(input: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(input).metadata();
    return (meta.pages ?? 1) > 1;
  } catch {
    return false;
  }
}
