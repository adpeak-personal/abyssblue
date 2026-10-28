"use client";

import { FileClock } from "lucide-react";
import { sinceLabel } from "./useDraft";

/**
 * 임시저장된 글이 있을 때 띄우는 안내.
 *
 * 자동으로 덮어쓰지 않고 묻는다 — 새 글을 쓰러 왔는데 예전 글이 들어차 있으면
 * 그게 더 당황스럽다.
 */
export function DraftBanner({
  savedAt,
  onRestore,
  onDiscard,
}: {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      <FileClock size={16} className="shrink-0" />
      <span>
        <b>{sinceLabel(savedAt)}</b> 작성하던 글이 있어요.
      </span>
      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={onRestore}
          className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
        >
          이어 쓰기
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-md border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
        >
          새로 쓰기
        </button>
      </div>
    </div>
  );
}
