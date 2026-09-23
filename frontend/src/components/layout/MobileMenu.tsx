"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search, PenSquare, LogIn, Plus, SlidersHorizontal } from "lucide-react";
import type { BoardGroup, User } from "@/types";
import { Avatar, LevelBadge } from "@/components/ui";
import { getMenuItems, isActive } from "@/lib/menu";
import { useFavoriteMenus } from "@/hooks/useFavoriteMenus";
import { BrandLogo } from "./Logo";
import { FavoriteMenuEditor } from "./FavoriteMenuEditor";
import { cn } from "@/lib/utils";

export function MobileMenu({ me, cafeName, boardGroups }: { me: User; cafeName: string; boardGroups: BoardGroup[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const pathname = usePathname();
  const favorites = getMenuItems(useFavoriteMenus().ids);
  const close = () => setOpen(false);

  // 열려 있는 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC 로 닫기 (편집 모달이 떠 있으면 모달이 먼저 닫힘)
  useEffect(() => {
    if (!open || editing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, editing]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-2 rounded-lg p-2 text-gray-700 hover:bg-gray-100 lg:hidden"
        aria-label="메뉴 열기"
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        <Menu size={22} />
      </button>

      {/* 배경 */}
      <div
        onClick={close}
        className={cn("fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")}
        aria-hidden
      />

      {/* 드로어 */}
      <aside
        id="mobile-menu"
        inert={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-80 flex-col bg-white shadow-2xl transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="전체 메뉴"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 px-4">
          <Link href="/" onClick={close} className="flex items-center" aria-label={cafeName}>
            <BrandLogo className="h-7" symbolSize={28} />
          </Link>
          <button type="button" onClick={close} className="-mr-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="메뉴 닫기">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* 내 정보 */}
          <div className="grad-deep m-4 rounded-xl p-4 text-white">
            <Link href="/mypage" onClick={close} className="flex items-center gap-3">
              <Avatar user={me} size={42} />
              <div className="min-w-0">
                <p className="truncate font-bold">{me.nickname}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ocean-100">
                  <LevelBadge level={me.level} /> {me.certLevel} · {me.totalDives}로그
                </p>
              </div>
            </Link>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/write" onClick={close} className="flex items-center justify-center gap-1 rounded-lg bg-white py-2 text-sm font-bold text-ocean-800">
                <PenSquare size={15} /> 글쓰기
              </Link>
              <Link href="/login" onClick={close} className="flex items-center justify-center gap-1 rounded-lg border border-white/40 py-2 text-sm font-medium">
                <LogIn size={15} /> 로그인
              </Link>
            </div>
          </div>

          {/* 검색 */}
          <form action="/search" onSubmit={close} className="px-4">
            <label className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2.5 text-sm text-gray-500 focus-within:ring-2 focus-within:ring-ocean-300">
              <Search size={16} />
              <input name="q" placeholder="포인트, 게시글, 장비 검색" className="w-full bg-transparent text-gray-800 outline-none" />
            </label>
          </form>

          {/* 자주 쓰는 메뉴 */}
          <nav className="p-4" aria-label="자주 쓰는 메뉴">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500">⭐ 자주 쓰는 메뉴</p>
              <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-ocean-700 hover:bg-ocean-50">
                <SlidersHorizontal size={13} /> 편집
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {favorites.map((m) => {
                const active = isActive(pathname, m.href);
                return (
                  <Link
                    key={m.id}
                    href={m.href}
                    onClick={close}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border px-1 py-3 text-center text-xs font-medium",
                      active ? "border-ocean-500 bg-ocean-50 text-ocean-700" : "border-gray-100 text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    <m.icon size={20} />
                    <span className="line-clamp-1">{m.label}</span>
                  </Link>
                );
              })}
              {favorites.length === 1 && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="col-span-2 flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ocean-300 py-3 text-xs text-ocean-700"
                >
                  <Plus size={20} /> 메뉴 추가하기
                </button>
              )}
            </div>
          </nav>

          {/* 게시판 */}
          <div className="border-t border-gray-100 pb-6">
            <Link href="/board/all" onClick={close} className="block px-5 pb-1 pt-4 text-sm font-bold text-gray-900">
              📋 전체글보기
            </Link>
            {boardGroups.map((g) => (
              <div key={g.id} className="mt-2">
                <p className="px-5 py-1.5 text-xs font-semibold text-gray-400">{g.name}</p>
                <ul>
                  {g.boards.map((b) => {
                    const active = isActive(pathname, `/board/${b.slug}`);
                    return (
                      <li key={b.id}>
                        <Link
                          href={`/board/${b.slug}`}
                          onClick={close}
                          className={cn(
                            "block border-l-2 px-5 py-2.5 text-[15px]",
                            active ? "border-ocean-600 bg-ocean-50 font-semibold text-ocean-700" : "border-transparent text-gray-700 active:bg-gray-50",
                          )}
                        >
                          {b.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <FavoriteMenuEditor open={editing} onClose={() => setEditing(false)} />
    </>
  );
}
