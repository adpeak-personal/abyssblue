"use client";

import { useRef, useState } from "react";
import { EditorContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import { Placeholder } from "@tiptap/extension-placeholder";
import { ImageView } from "./nodes/ImageView";
import { ResizableImage, schemaExtensions } from "./schema";
import { StickyAlign } from "./extensions/StickyAlign";
import { SelectionDecoration } from "./extensions/SelectionDecoration";
import { Toolbar } from "./toolbar/Toolbar";
import { HtmlSource } from "./HtmlSource";
import { ACCEPTED_IMAGE_TYPES, useImageUpload } from "./hooks/useImageUpload";
import { cn } from "./lib/cn";
import type { RichEditorProps } from "./types";

/**
 * 재사용 가능한 리치 텍스트 에디터.
 *
 * 프로젝트에 묶이는 건 `uploadImage` 하나뿐이다. 이걸 넘기지 않으면
 * 이미지 기능만 꺼지고 나머지는 그대로 동작한다.
 *
 * 저장 포맷은 ProseMirror JSON 이고, HTML 은 서버가 같은 스키마(schema.ts)로
 * 파생시킨다 — 클라이언트가 만든 HTML 을 믿지 않기 위해서다.
 */
export function RichEditor({
  defaultValue,
  placeholder,
  onChange,
  uploadImage,
  editable = true,
  className,
  minHeight = "360px",
}: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [htmlOpen, setHtmlOpen] = useState(false);

  const editor = useEditor({
    // SSR 중에는 렌더하지 않는다 — 없으면 하이드레이션 불일치가 난다
    immediatelyRender: false,
    editable,
    extensions: [
      ...schemaExtensions.filter((ext) => ext.name !== ResizableImage.name),
      // 스키마는 공유하되 노드뷰(크기 조절 UI)는 클라이언트에서만 붙인다
      ResizableImage.extend({ addNodeView: () => ReactNodeViewRenderer(ImageView) }),
      Placeholder.configure({ placeholder: placeholder ?? "내용을 입력하세요." }),
      // 고른 정렬이 다음 줄에도 이어지게 한다 (스키마 아님 — 편집 동작)
      StickyAlign,
      // 전체 선택했을 때 이미지도 선택된 것으로 보이게
      SelectionDecoration,
    ],
    content: defaultValue,
    editorProps: {
      attributes: { class: "editor-content px-1 py-3 outline-none", style: `min-height:${minHeight}` },
      handlePaste: (_view, event) => {
        const files = filesFrom(event.clipboardData);
        if (files.length === 0) return false;
        event.preventDefault();
        void insert(files);
        return true; // 기본 붙여넣기 대신 업로드로 처리
      },
      handleDrop: (_view, event) => {
        const files = filesFrom((event as DragEvent).dataTransfer);
        if (files.length === 0) return false;
        event.preventDefault();
        void insert(files);
        return true;
      },
    },
    // isEmpty 는 이미지·표 같은 리프/블록 노드가 있으면 false 라, 사진만 올린 글도 통과한다
    onUpdate: ({ editor }) => onChange?.(editor.getJSON(), editor.isEmpty),
  });

  const { uploading, error, insert, filesFrom, enabled } = useImageUpload(editor, uploadImage);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = ""; // 같은 파일을 연속으로 고를 수 있게 초기화
    void insert(files);
  };

  if (!editor) {
    return <div className="min-h-[420px] animate-pulse rounded-lg bg-gray-50" aria-hidden />;
  }

  return (
    <div className={className}>
      {editable && (
        <Toolbar
          editor={editor}
          uploading={uploading}
          canUpload={enabled}
          htmlOpen={htmlOpen}
          onToggleHtml={() => setHtmlOpen((v) => !v)}
          onPickImage={() => fileInputRef.current?.click()}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
        onChange={onFileChange}
        className="hidden"
      />

      {htmlOpen ? (
        <div className="py-3">
          <HtmlSource editor={editor} onClose={() => setHtmlOpen(false)} />
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}

      {error && (
        <p role="alert" className={cn("mt-1 text-xs text-coral-500")}>
          {error}
        </p>
      )}
    </div>
  );
}
