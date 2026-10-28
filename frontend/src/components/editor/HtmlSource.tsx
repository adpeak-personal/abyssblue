"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { AlertTriangle, Check, X } from "lucide-react";

/**
 * HTML 직접 편집 패널.
 *
 * 저장 정본은 ProseMirror JSON 이라, 여기서 넣은 HTML 은 에디터 스키마를 통과하며
 * 파싱된다. 스키마에 없는 태그(<script>, <div>, <iframe> …)는 이 단계에서 사라진다 —
 * 막는 게 아니라 "변환된다" 는 점을 사용자에게 미리 알려준다.
 */
export function HtmlSource({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [value, setValue] = useState(() => formatHtml(editor.getHTML()));
  const [applied, setApplied] = useState(false);

  const apply = () => {
    // setContent 가 스키마 기준으로 파싱한다 — 허용되지 않은 태그는 여기서 걸러진다
    editor.commands.setContent(value, { emitUpdate: true });
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
      onClose();
    }, 600);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50">
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
        <span className="font-mono text-xs font-bold text-gray-700">HTML</span>
        <span className="flex items-center gap-1 text-[11px] text-amber-700">
          <AlertTriangle size={12} />
          에디터가 지원하지 않는 태그는 적용할 때 사라집니다
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded p-1 text-gray-400 hover:bg-gray-200"
          aria-label="HTML 편집 닫기"
        >
          <X size={15} />
        </button>
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        spellCheck={false}
        rows={16}
        className="block w-full resize-y bg-transparent px-3 py-2 font-mono text-[13px] leading-6 outline-none"
      />

      <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-3 py-2">
        {applied && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <Check size={13} /> 적용됨
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600"
        >
          취소
        </button>
        <button
          type="button"
          onClick={apply}
          className="rounded-lg bg-ocean-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-ocean-700"
        >
          본문에 적용
        </button>
      </div>
    </div>
  );
}

/** 블록 태그마다 줄을 바꿔 읽기 좋게 — 보기용이라 완벽한 포매터일 필요는 없다 */
function formatHtml(html: string) {
  return html
    .replace(/></g, ">\n<")
    .replace(/\n<\/(strong|em|s|u|code|a|span)>/g, "</$1>")
    .trim();
}
