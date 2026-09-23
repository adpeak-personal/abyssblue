"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { getMenuItems, isActive } from "@/lib/menu";
import { useFavoriteMenus } from "@/hooks/useFavoriteMenus";
import { FavoriteMenuEditor } from "./FavoriteMenuEditor";
import { cn } from "@/lib/utils";

/** 헤더 아래 개인별 자주 쓰는 메뉴 (태블릿 이상) */
export function FavoriteMenuBar() {
  const pathname = usePathname();
  const { ids } = useFavoriteMenus();
  const [editing, setEditing] = useState(false);
  const items = getMenuItems(ids);

  return (
    <nav className="mx-auto hidden max-w-6xl items-center gap-2 px-4 md:flex" aria-label="자주 쓰는 메뉴">
      <ul className="scrollbar-none -mb-px flex min-w-0 gap-5 overflow-x-auto text-[15px]">
        {items.map((m) => {
          const active = isActive(pathname, m.href);
          return (
            <li key={m.id}>
              <Link
                href={m.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap border-b-2 py-2.5 font-medium",
                  active ? "border-ocean-600 text-ocean-700" : "border-transparent text-gray-600 hover:border-ocean-300 hover:text-ocean-700",
                )}
              >
                <m.icon size={16} />
                {m.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs",
          items.length === 1 ? "border border-dashed border-ocean-300 text-ocean-700 hover:bg-ocean-50" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700",
        )}
      >
        <SlidersHorizontal size={13} />
        {items.length === 1 ? "자주 쓰는 메뉴 추가" : "편집"}
      </button>

      <FavoriteMenuEditor open={editing} onClose={() => setEditing(false)} />
    </nav>
  );
}
