"use client";

import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Undo2,
} from "lucide-react";
import { ToolButton, ToolDivider } from "./ToolButton";
import { TableToolbar } from "./TableToolbar";
import { AlignMenu } from "./AlignMenu";

export function Toolbar({
  editor,
  onPickImage,
  uploading,
  canUpload,
  htmlOpen,
  onToggleHtml,
}: {
  editor: Editor;
  onPickImage: () => void;
  uploading: boolean;
  canUpload: boolean;
  htmlOpen: boolean;
  onToggleHtml: () => void;
}) {
  // 선택 영역이 바뀔 때마다 active 상태를 다시 그려야 해서 강제 리렌더를 건다
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    editor.on("selectionUpdate", rerender);
    editor.on("transaction", rerender);
    return () => {
      editor.off("selectionUpdate", rerender);
      editor.off("transaction", rerender);
    };
  }, [editor]);

  const chain = () => editor.chain().focus();

  const setLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const input = window.prompt("연결할 주소를 입력하세요", previous ?? "https://");
    if (input === null) return;

    const href = input.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    // javascript: 같은 스킴 차단 — http/https 만 허용
    if (!/^https?:\/\//i.test(href)) {
      window.alert("http:// 또는 https:// 로 시작하는 주소만 넣을 수 있어요.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }, [editor]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 pb-2">
        <ToolButton label="굵게" onClick={() => chain().toggleBold().run()} active={editor.isActive("bold")}>
          <Bold size={17} />
        </ToolButton>
        <ToolButton label="기울임" onClick={() => chain().toggleItalic().run()} active={editor.isActive("italic")}>
          <Italic size={17} />
        </ToolButton>
        <ToolButton label="취소선" onClick={() => chain().toggleStrike().run()} active={editor.isActive("strike")}>
          <Strikethrough size={17} />
        </ToolButton>

        <ToolDivider />

        <ToolButton label="제목" onClick={() => chain().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          <Heading2 size={17} />
        </ToolButton>
        <ToolButton label="소제목" onClick={() => chain().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>
          <Heading3 size={17} />
        </ToolButton>

        <ToolDivider />

        {/* 정렬 — 이미지도 정렬 대상이라 같은 메뉴로 동작한다 */}
        <AlignMenu editor={editor} />

        <ToolDivider />

        <ToolButton label="글머리 기호" onClick={() => chain().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <List size={17} />
        </ToolButton>
        <ToolButton label="번호 매기기" onClick={() => chain().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <ListOrdered size={17} />
        </ToolButton>
        <ToolButton label="인용" onClick={() => chain().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          <Quote size={17} />
        </ToolButton>
        <ToolButton label="구분선" onClick={() => chain().setHorizontalRule().run()}>
          <Minus size={17} />
        </ToolButton>

        <ToolDivider />

        <ToolButton label="링크" onClick={setLink} active={editor.isActive("link")}>
          <Link2 size={17} />
        </ToolButton>
        <ToolButton label="링크 해제" onClick={() => chain().unsetLink().run()} disabled={!editor.isActive("link")}>
          <Link2Off size={17} />
        </ToolButton>
        <ToolButton
          label={canUpload ? "이미지" : "이미지 업로드 미설정"}
          onClick={onPickImage}
          disabled={uploading || !canUpload}
        >
          {uploading ? <Loader2 size={17} className="animate-spin" /> : <ImageIcon size={17} />}
        </ToolButton>
        <ToolButton
          label="표 삽입 (3×3)"
          onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          active={editor.isActive("table")}
        >
          <TableIcon size={17} />
        </ToolButton>

        <ToolDivider />

        <ToolButton label="HTML 편집" onClick={onToggleHtml} active={htmlOpen}>
          <Code2 size={17} />
        </ToolButton>

        <ToolDivider />

        <ToolButton label="실행 취소" onClick={() => chain().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 size={17} />
        </ToolButton>
        <ToolButton label="다시 실행" onClick={() => chain().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 size={17} />
        </ToolButton>
      </div>

      {editor.isActive("table") && <TableToolbar editor={editor} />}
    </>
  );
}
