"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronUp, ChevronDown, Check, Plus, Lock, RotateCcw } from "lucide-react";
import { HOME_MENU_ID, MAX_FAVORITES, MENU_CATALOG, getMenuItems } from "@/lib/menu";
import { useFavoriteMenus } from "@/hooks/useFavoriteMenus";
import { cn } from "@/lib/utils";

export function FavoriteMenuEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ids, toggle, move, reset, isFull, addedCount } = useFavoriteMenus();
  const selected = getMenuItems(ids);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // 헤더/드로어의 쌓임 맥락에서 벗어나도록 body 에 렌더
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="fav-editor-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />

      <div className="relative flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 id="fav-editor-title" className="text-lg font-bold text-gray-900">자주 쓰는 메뉴 편집</h2>
            <p className="text-xs text-gray-500">자주 가는 메뉴를 최대 {MAX_FAVORITES}개까지 골라 모아두세요.</p>
          </div>
          <button type="button" onClick={onClose} className="-mr-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* 내 메뉴 (순서 변경) */}
          <section className="border-b border-gray-100 bg-ocean-50/50 px-5 py-4">
            <p className="mb-2 text-xs font-semibold text-ocean-800">
              내 메뉴{" "}
              <span className={cn("font-normal", isFull ? "font-semibold text-coral-500" : "text-gray-500")}>
                {addedCount}/{MAX_FAVORITES}
                {isFull && " · 가득 찼어요. 다른 메뉴를 빼고 추가하세요"}
              </span>
            </p>
            <ol className="space-y-1.5">
              {selected.map((m, i) => {
                const locked = m.id === HOME_MENU_ID;
                return (
                  <li key={m.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-1.5">
                    <m.icon size={17} className="text-ocean-600" />
                    <span className="flex-1 text-sm font-medium text-gray-800">{m.label}</span>
                    {locked ? (
                      <span className="flex items-center gap-1 px-2 text-[11px] text-gray-400"><Lock size={12} /> 고정</span>
                    ) : (
                      <>
                        <button type="button" onClick={() => move(m.id, -1)} disabled={i <= 1} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label={`${m.label} 위로`}>
                          <ChevronUp size={16} />
                        </button>
                        <button type="button" onClick={() => move(m.id, 1)} disabled={i === selected.length - 1} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label={`${m.label} 아래로`}>
                          <ChevronDown size={16} />
                        </button>
                        <button type="button" onClick={() => toggle(m.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500" aria-label={`${m.label} 빼기`}>
                          <X size={16} />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
            {selected.length === 1 && <p className="mt-2 text-xs text-gray-500">👇 아래에서 메뉴를 눌러 추가해 보세요.</p>}
          </section>

          {/* 추가할 수 있는 메뉴 */}
          <div className="space-y-4 px-5 py-4">
            {MENU_CATALOG.map((g) => (
              <section key={g.name}>
                <p className="mb-2 text-xs font-semibold text-gray-400">{g.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  {g.items.map((m) => {
                    const added = ids.includes(m.id);
                    const locked = m.id === HOME_MENU_ID;
                    const disabled = locked || (!added && isFull);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggle(m.id)}
                        disabled={disabled}
                        aria-pressed={added}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition",
                          added ? "border-ocean-500 bg-ocean-50 font-semibold text-ocean-800" : "border-gray-200 text-gray-700 hover:border-ocean-300",
                          disabled && !added && "opacity-40",
                          locked && "cursor-default",
                        )}
                      >
                        <m.icon size={16} className={added ? "text-ocean-600" : "text-gray-400"} />
                        <span className="flex-1 truncate">{m.label}</span>
                        {added ? <Check size={15} className="text-ocean-600" /> : <Plus size={15} className="text-gray-300" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-gray-100 px-5 py-3">
          <button type="button" onClick={reset} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <RotateCcw size={14} /> 초기화
          </button>
          <button type="button" onClick={onClose} className="rounded-lg bg-ocean-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ocean-700">
            완료
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
