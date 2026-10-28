"use client";

import type { Editor } from "@tiptap/react";
import { Columns3, Merge, Rows3, Split, Trash2 } from "lucide-react";
import { ToolButton, ToolDivider } from "./ToolButton";

/** 표 안에 커서가 있을 때만 나타나는 행/열 편집 줄 */
export function TableToolbar({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus();

  return (
    <div className="mt-1 flex flex-wrap items-center gap-0.5 rounded-lg bg-ocean-50/60 px-1 py-0.5">
      <span className="px-2 text-[11px] font-medium text-ocean-800">표</span>

      <ToolButton label="위에 행 추가" onClick={() => chain().addRowBefore().run()}>
        <Rows3 size={16} className="-scale-y-100" />
      </ToolButton>
      <ToolButton label="아래에 행 추가" onClick={() => chain().addRowAfter().run()}>
        <Rows3 size={16} />
      </ToolButton>
      <ToolButton label="행 삭제" onClick={() => chain().deleteRow().run()}>
        <Rows3 size={16} className="text-coral-500" />
      </ToolButton>

      <ToolDivider />

      <ToolButton label="왼쪽에 열 추가" onClick={() => chain().addColumnBefore().run()}>
        <Columns3 size={16} className="-scale-x-100" />
      </ToolButton>
      <ToolButton label="오른쪽에 열 추가" onClick={() => chain().addColumnAfter().run()}>
        <Columns3 size={16} />
      </ToolButton>
      <ToolButton label="열 삭제" onClick={() => chain().deleteColumn().run()}>
        <Columns3 size={16} className="text-coral-500" />
      </ToolButton>

      <ToolDivider />

      <ToolButton label="셀 병합" onClick={() => chain().mergeCells().run()} disabled={!editor.can().mergeCells()}>
        <Merge size={16} />
      </ToolButton>
      <ToolButton label="셀 분할" onClick={() => chain().splitCell().run()} disabled={!editor.can().splitCell()}>
        <Split size={16} />
      </ToolButton>
      <ToolButton label="머리글 행 전환" onClick={() => chain().toggleHeaderRow().run()}>
        <span className="text-[13px] font-bold">H</span>
      </ToolButton>

      <ToolDivider />

      <ToolButton label="표 삭제" onClick={() => chain().deleteTable().run()}>
        <Trash2 size={16} className="text-coral-500" />
      </ToolButton>
    </div>
  );
}
