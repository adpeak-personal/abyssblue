"use client";

import { useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { UploadImage } from "../types";

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/gif,image/webp";

/**
 * 방금 넣은 이미지 뒤로 커서를 옮긴다.
 *
 * 위치를 미리 계산해 두지 않고 src 로 찾는다 — 업로드 주소에 UUID 가 들어 있어
 * 문서에서 유일하고, ProseMirror 가 삽입 위치를 조정해도 안전하게 찾을 수 있다.
 */
function placeCursorAfterImage(editor: Editor, src: string, textAlign: string | null) {
  let after: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (after !== null) return false;
    if (node.type.name === "image" && node.attrs.src === src) {
      after = pos + node.nodeSize;
      return false;
    }
    return true;
  });
  if (after === null) return;

  // 이미지가 마지막이거나 뒤가 또 이미지면 글을 이어 쓸 자리가 없다 — 문단을 만들어 준다
  const next = editor.state.doc.resolve(after).nodeAfter;
  const chain = editor.chain();
  if (!next?.isTextblock) {
    chain.insertContentAt(after, {
      type: "paragraph",
      ...(textAlign ? { attrs: { textAlign } } : {}),
    });
  }
  // 문단 안쪽(+1)으로 커서를 넣는다
  chain.setTextSelection(after + 1).run();
}

/**
 * 이미지 업로드 + 본문 삽입.
 *
 * 툴바 버튼, 붙여넣기, 드래그&드롭 세 경로가 모두 이 훅을 쓴다.
 * 삽입 시 현재 문단의 정렬을 이어받아서, 가운데 정렬 상태로 넣으면
 * 이미지도 가운데로 들어간다.
 */
export function useImageUpload(editor: Editor | null, uploadImage?: UploadImage) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insert = useCallback(
    async (files: File[]) => {
      if (!editor || !uploadImage || files.length === 0) return;

      // 삽입 시점의 정렬 — 현재 블록에 없으면 툴바에서 고정해 둔 값을 쓴다
      const textAlign =
        (editor.getAttributes("paragraph").textAlign as string | undefined) ??
        editor.storage.stickyAlign?.last ??
        null;

      setError(null);
      setUploading(true);
      try {
        for (const file of files) {
          const { url } = await uploadImage(file);
          // 정렬은 삽입 시 attrs 로 함께 넣는다 —
          // updateAttributes 는 삽입 후 선택 위치에 따라 이미지 노드를 못 잡을 수 있다
          editor
            .chain()
            .focus()
            .setImage({ src: url, alt: file.name, ...(textAlign ? { textAlign } : {}) })
            .run();

          // 삽입 직후 커서는 이미지 '앞' 에 남는다 — 그 상태로 엔터를 치면
          // 새 줄이 이미지 위에 생긴다. 이어서 쓸 수 있게 뒤로 옮겨 준다.
          placeCursorAfterImage(editor, url, textAlign);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "이미지 업로드에 실패했어요.");
      } finally {
        setUploading(false);
      }
    },
    [editor, uploadImage],
  );

  /** DataTransfer 에서 이미지 파일만 골라낸다 */
  const filesFrom = useCallback((data: DataTransfer | null) => {
    if (!data) return [];
    return [...data.files].filter((f) => ACCEPTED_IMAGE_TYPES.includes(f.type));
  }, []);

  return { uploading, error, setError, insert, filesFrom, enabled: Boolean(uploadImage) };
}
