"use client";

import type { BoardGroup } from "@/types";

/** 게시판 + 말머리 선택 — 에디터 폼과 사진 폼이 함께 쓴다 */
export function BoardSelect({
  boardGroups,
  boardSlug,
  category,
  categories,
  onBoardChange,
  onCategoryChange,
  lockBoard = false,
}: {
  boardGroups: BoardGroup[];
  boardSlug: string;
  category: string;
  categories?: string[];
  onBoardChange: (slug: string) => void;
  onCategoryChange: (category: string) => void;
  /** 수정일 때 — 게시판 이동은 지원하지 않는다 (작성 방식·화질 정책이 게시판에 걸려 있다) */
  lockBoard?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <select
        name="board"
        value={boardSlug}
        onChange={(e) => onBoardChange(e.target.value)}
        disabled={lockBoard}
        className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm disabled:bg-gray-50 disabled:text-gray-500 sm:w-56"
      >
        {boardGroups.map((g) => (
          <optgroup key={g.id} label={g.name}>
            {g.boards.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {categories && (
        <select
          name="category"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm sm:w-40"
        >
          <option value="">말머리 선택</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      )}
    </div>
  );
}
