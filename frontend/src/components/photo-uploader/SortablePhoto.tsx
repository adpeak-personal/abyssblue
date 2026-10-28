"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Star, X } from "lucide-react";
import { cn } from "./lib/cn";
import type { PhotoItem } from "./types";

export function SortablePhoto({
  photo,
  index,
  showCaption,
  onRemove,
  onCaption,
}: {
  photo: PhotoItem;
  index: number;
  showCaption: boolean;
  onRemove: () => void;
  onCaption: (caption: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-white",
        isDragging ? "z-10 border-ocean-400 shadow-lg" : "border-gray-200",
      )}
    >
      <div className="relative aspect-square bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 경로는 호스트 앱이 정한다 */}
        <img src={photo.url} alt="" className="h-full w-full object-cover" draggable={false} />

        {/* 드래그는 손잡이로만 — 이미지 전체를 잡게 하면 모바일에서 스크롤이 막힌다 */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${index + 1}번째 사진 순서 바꾸기`}
          className="absolute left-1 top-1 cursor-grab touch-none rounded bg-black/55 p-1 text-white active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>

        <button
          type="button"
          onClick={onRemove}
          aria-label={`${index + 1}번째 사진 삭제`}
          className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white hover:bg-black/75"
        >
          <X size={13} />
        </button>

        {index === 0 && (
          <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-ocean-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            <Star size={9} fill="currentColor" /> 대표
          </span>
        )}
      </div>

      {showCaption && (
        <input
          value={photo.caption}
          onChange={(e) => onCaption(e.target.value)}
          maxLength={80}
          placeholder="사진 설명 (선택)"
          className="w-full border-t border-gray-100 px-2 py-1.5 text-xs outline-none focus:bg-ocean-50/40"
        />
      )}
    </li>
  );
}
