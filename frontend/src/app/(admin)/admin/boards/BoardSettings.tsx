"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AdminBoard, AdminBoardGroup } from "@/types/admin";
import type { BoardType, WriteMode } from "@/types";

const TYPE_LABEL: Record<BoardType, string> = {
  list: "목록형",
  gallery: "갤러리형",
  qna: "질문답변형",
};

const WRITE_MODE_LABEL: Record<WriteMode, string> = {
  editor: "에디터 (서식·표·본문 이미지)",
  photo: "사진 업로더 (사진 + 글만)",
};

/** 말머리 입력 — 칩으로 보여주고 Enter 로 추가 */
function CategoryInput({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    if (value.includes(name)) return setDraft("");
    onChange([...value, name]);
    setDraft("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5 focus-within:border-ocean-400">
      {value.map((c) => (
        <span key={c} className="flex items-center gap-1 rounded bg-ocean-50 px-2 py-0.5 text-xs text-ocean-700">
          {c}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== c))} aria-label={`${c} 삭제`}>
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // 폼 제출 대신 말머리 추가
            add();
          }
          // 빈 입력에서 Backspace 면 마지막 칩 삭제
          if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? "추가…" : "말머리 없음 (입력 후 Enter)"}
        className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none"
      />
    </div>
  );
}

function BoardCard({ board }: { board: AdminBoard }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description);
  const [type, setType] = useState<BoardType>(board.type);
  const [writeMode, setWriteMode] = useState<WriteMode>(board.writeMode ?? "editor");
  const [highQuality, setHighQuality] = useState(board.highQuality ?? false);
  const [categories, setCategories] = useState<string[]>(board.categories ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    name !== board.name ||
    description !== board.description ||
    type !== board.type ||
    writeMode !== (board.writeMode ?? "editor") ||
    highQuality !== (board.highQuality ?? false) ||
    JSON.stringify(categories) !== JSON.stringify(board.categories ?? []);

  const save = async () => {
    setError(null);
    if (!name.trim()) return setError("게시판 이름을 입력해 주세요.");

    setSaving(true);
    try {
      await apiFetch(`/admin/boards/${board.slug}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          type,
          writeMode,
          highQuality,
          categories,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh(); // 서버 컴포넌트가 새 값으로 다시 그리도록
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-50"
      >
        <ChevronDown size={15} className={cn("shrink-0 text-gray-400 transition", open && "rotate-180")} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900">{board.name}</span>
          <span className="mt-0.5 block truncate text-xs text-gray-400">
            /{board.slug} · {TYPE_LABEL[board.type]} · {board.writeMode === "photo" ? "사진 업로더" : "에디터"}
            {board.categories?.length ? ` · 말머리 ${board.categories.length}개` : " · 말머리 없음"}
          </span>
        </span>
        <span className="shrink-0 text-xs text-gray-500">글 {board.postCount}</span>
        {dirty && <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">수정됨</span>}
      </button>

      {open && (
        <div className="space-y-3 bg-gray-50/70 px-5 pb-4 pt-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-gray-600">이름</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-600">목록 형식</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as BoardType)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400"
              >
                {Object.entries(TYPE_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-600">글 작성 방식</span>
            <select
              value={writeMode}
              onChange={(e) => setWriteMode(e.target.value as WriteMode)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400"
            >
              {Object.entries(WRITE_MODE_LABEL).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-gray-400">
              방식을 바꿔도 기존 글은 그대로 보입니다 — 저장 형식이 같습니다.
            </span>
          </label>

          <label className="flex items-start gap-2 rounded-lg bg-white px-3 py-2.5">
            <input
              type="checkbox"
              checked={highQuality}
              onChange={(e) => setHighQuality(e.target.checked)}
              className="mt-0.5 accent-ocean-600"
            />
            <span>
              <span className="block text-xs font-medium text-gray-700">사진 고화질 보관</span>
              <span className="block text-[11px] text-gray-400">
                수중사진 갤러리처럼 사진이 콘텐츠인 게시판만 켜세요. 용량을 훨씬 많이 씁니다.
              </span>
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-600">설명</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400"
            />
          </label>

          <div>
            <span className="text-xs font-medium text-gray-600">말머리</span>
            <div className="mt-1">
              <CategoryInput value={categories} onChange={setCategories} />
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              목록에서 제목 앞에 붙습니다. 비워두면 글쓰기에서 말머리 선택이 사라지고 목록엔 [일반]로 표시됩니다.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-coral-500">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Check size={13} /> 저장됨
              </span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="flex items-center gap-1.5 rounded-lg bg-ocean-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              저장
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function BoardSettings({ groups }: { groups: AdminBoardGroup[] }) {
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <h2 className="border-b border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-bold text-gray-700">
            {g.name}
            <span className="ml-1.5 font-normal text-gray-400">{g.boards.length}개</span>
          </h2>
          <ul>
            {g.boards.map((b) => (
              <BoardCard key={b.slug} board={b} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
