import type { JSONContent } from "@tiptap/core";

export interface UploadedImage {
  /** 본문에 넣을 주소 — 상대경로 권장(스토리지 이관 시 본문을 안 건드려도 된다) */
  url: string;
}

/**
 * 이미지 업로드 구현체. 에디터는 업로드 방식을 모른다 —
 * 호스팅하는 쪽이 자기 API 에 맞게 넘겨준다.
 */
export type UploadImage = (file: File) => Promise<UploadedImage>;

export interface RichEditorProps {
  /** 초기 본문 — ProseMirror JSON */
  defaultValue?: JSONContent;
  placeholder?: string;
  /** 본문이 바뀔 때마다 호출. empty 는 제출 가능 여부 판단용 */
  onChange?: (doc: JSONContent, empty: boolean) => void;
  /** 없으면 이미지 버튼과 붙여넣기 업로드가 비활성화된다 */
  uploadImage?: UploadImage;
  /** 읽기 전용 미리보기로 쓸 때 */
  editable?: boolean;
  className?: string;
  /** 본문 최소 높이 (CSS 길이). 기본 360px */
  minHeight?: string;
}
