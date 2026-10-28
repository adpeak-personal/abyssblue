"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Check, ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";
import { rememberAlign } from "../extensions/StickyAlign";

const ALIGNMENTS = [
  { value: "left", label: "왼쪽 정렬", icon: AlignLeft },
  { value: "center", label: "가운데 정렬", icon: AlignCenter },
  { value: "right", label: "오른쪽 정렬", icon: AlignRight },
  { value: "justify", label: "양쪽 정렬", icon: AlignJustify },
] as const;

/**
 * 정렬 드롭다운.
 *
 * 아이콘만 4개 늘어놓으면 글머리 기호 아이콘과 구분이 안 돼서
 * "정렬" 이라는 글자를 달고 묶어 둔다.
 */
export function AlignMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = ALIGNMENTS.find((a) => editor.isActive({ textAlign: a.value })) ?? ALIGNMENTS[0];
  const CurrentIcon = current.icon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="정렬"
        className={cn(
          "flex items-center gap-0.5 rounded px-2 py-2 text-gray-500 transition hover:bg-gray-100",
          open && "bg-gray-100",
        )}
      >
        <CurrentIcon size={17} />
        <span className="text-xs">정렬</span>
        <ChevronDown size={12} className={cn("transition", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {ALIGNMENTS.map(({ value, label, icon: Icon }) => {
            const active = editor.isActive({ textAlign: value });
            return (
              <button
                key={value}
                type="button"
                role="menuitem"
                onClick={() => {
                  // 이후 새로 생기는 빈 블록도 같은 정렬을 따르게 기억해 둔다
                  rememberAlign(editor.storage.stickyAlign, value);
                  editor.chain().focus().setTextAlign(value).run();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50",
                  active ? "font-semibold text-ocean-700" : "text-gray-700",
                )}
              >
                <Icon size={15} />
                {label}
                {active && <Check size={13} className="ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
