import type { JSONContent } from "@tiptap/core";
import type { Post, WriteMode } from "@/types";

/**
 * 수정 화면에 넘길 원본 (`GET /posts/:id/edit` 응답).
 *
 * 상세 조회 응답을 그대로 쓰지 않는 이유 — 수정에는 저장된 정본(JSON)이 필요하고,
 * 그 안의 이미지 경로가 전체 URL 로 바뀌어 있어야 에디터가 미리보기를 띄울 수 있다.
 */
export interface EditTarget {
  id: number;
  boardSlug: string;
  writeMode: WriteMode;
  category: string | null;
  title: string;
  content: string;
  contentJson: JSONContent | null;
  price: number | null;
  tradeStatus: Post["tradeStatus"] | null;
}
