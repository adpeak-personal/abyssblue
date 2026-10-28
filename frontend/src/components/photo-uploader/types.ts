export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/gif,image/webp";

export interface UploadedImage {
  /** 본문에 넣을 주소 — 상대경로 권장(스토리지 이관 시 저장본을 안 건드려도 된다) */
  url: string;
}

/**
 * 이미지 업로드 구현체.
 * 이 모듈은 업로드 방식을 모른다 — 호스팅하는 쪽이 자기 API 에 맞게 넘겨준다.
 */
export type UploadImage = (file: File) => Promise<UploadedImage>;

export interface PhotoItem {
  /** 정렬용 고유 키 — 같은 파일을 두 번 올릴 수도 있어 url 과 별개로 둔다 */
  id: string;
  url: string;
  caption: string;
}

export interface PhotoUploaderProps {
  photos: PhotoItem[];
  onChange: (next: PhotoItem[]) => void;
  uploadImage: UploadImage;
  /** 기본 30장 */
  maxCount?: number;
  /** 사진마다 설명 입력칸을 보여줄지 (기본 true) */
  showCaptions?: boolean;
  className?: string;
}
