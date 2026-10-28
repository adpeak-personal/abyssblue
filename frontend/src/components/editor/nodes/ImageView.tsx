"use client";

import { useCallback, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { cn } from "../lib/cn";

const MIN_WIDTH = 10; // %
const MAX_WIDTH = 100;

const JUSTIFY: Record<string, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

/**
 * 이미지 노드뷰 — 선택 표시 + 모서리 드래그로 크기 조절.
 *
 * 폭은 % 로 저장한다. 드래그 중에는 화면에 바로 반영하고,
 * 손을 뗄 때 한 번만 문서에 기록해서 undo 기록이 잘게 쪼개지지 않게 한다.
 */
export function ImageView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const { src, alt, title, width, textAlign } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
    width: number | null;
    textAlign?: string;
  };

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const editable = editor.isEditable;

  const startResize = useCallback(
    (e: React.PointerEvent, side: "left" | "right") => {
      e.preventDefault();
      e.stopPropagation();

      const container = wrapperRef.current?.parentElement;
      const img = wrapperRef.current?.querySelector("img");
      if (!container || !img) return;

      const containerWidth = container.getBoundingClientRect().width;
      const startX = e.clientX;
      const startWidth = (img.getBoundingClientRect().width / containerWidth) * 100;

      const onMove = (ev: PointerEvent) => {
        // 왼쪽 핸들은 끄는 방향이 반대다
        const delta = ((ev.clientX - startX) / containerWidth) * 100 * (side === "left" ? -1 : 1);
        const next = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta)));
        setDragWidth(next);
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const delta = ((ev.clientX - startX) / containerWidth) * 100 * (side === "left" ? -1 : 1);
        const next = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta)));
        setDragWidth(null);
        updateAttributes({ width: next });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [updateAttributes],
  );

  const shownWidth = dragWidth ?? width;

  return (
    <NodeViewWrapper
      className={cn("editor-image flex", JUSTIFY[textAlign ?? "left"] ?? "justify-start")}
      data-drag-handle
    >
      <div
        ref={wrapperRef}
        // editor-image-box 는 이미지 크기에 딱 맞는 상자다 —
        // 범위 선택 표시(globals.css)가 이 상자에만 덮이도록 붙여 둔 이름
        className={cn(
          "editor-image-box relative inline-block max-w-full leading-none",
          selected && "outline outline-2 outline-offset-2 outline-ocean-500",
        )}
        style={{ width: shownWidth ? `${shownWidth}%` : undefined }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 경로는 rewrite 라 next/image 미적용 */}
        <img src={src} alt={alt ?? ""} title={title} className="block h-auto w-full rounded-lg" draggable={false} />

        {editable && selected && (
          <>
            {(["left", "right"] as const).map((side) => (
              <span
                key={side}
                role="presentation"
                onPointerDown={(e) => startResize(e, side)}
                className={cn(
                  "absolute top-1/2 h-9 w-2.5 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-white bg-ocean-500 shadow",
                  side === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
                )}
              />
            ))}

            {/* 드래그 중 현재 폭을 보여준다 */}
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
              {shownWidth ? `${shownWidth}%` : "원본"}
            </span>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
