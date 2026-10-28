"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, List, MapPinned, type LucideIcon } from "lucide-react";
import { isActive } from "@/lib/menu";
import { cn } from "@/lib/utils";
import type { BoardGroup } from "@/types";

/**
 * 사이드바의 메뉴 목록.
 *
 * Sidebar 는 서버 컴포넌트라 현재 주소를 알 수 없다. 지금 보고 있는 메뉴에 표시를
 * 하려면 주소가 필요해서 이 부분만 클라이언트로 떼어 놓았다.
 * (모바일 메뉴·자주 쓰는 메뉴는 이미 같은 방식으로 표시하고 있었다.)
 */

const TOOLS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/points", label: "다이빙 포인트", icon: MapPinned },
  { href: "/logbook", label: "나의 로그북", icon: BookOpen },
  { href: "/tours", label: "투어 · 번개 모집", icon: CalendarDays },
];

export function SidebarTools() {
  const pathname = usePathname();

  return (
    <nav className="rounded-xl border border-gray-200 bg-white p-2">
      <ul>
        {TOOLS.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-ocean-50 font-semibold text-ocean-700"
                    : "text-gray-700 hover:bg-ocean-50 hover:text-ocean-700",
                )}
              >
                <t.icon size={17} className={active ? "text-ocean-600" : "text-ocean-500"} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SidebarBoards({ boardGroups }: { boardGroups: BoardGroup[] }) {
  const pathname = usePathname();
  const allActive = isActive(pathname, "/board/all");

  return (
    <nav className="rounded-xl border border-gray-200 bg-white py-2">
      <Link
        href="/board/all"
        aria-current={allActive ? "page" : undefined}
        className={cn(
          "mx-2 mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition",
          allActive ? "bg-ocean-50 text-ocean-700" : "text-gray-900 hover:bg-gray-50",
        )}
      >
        <List size={16} className={allActive ? "text-ocean-600" : "text-gray-400"} /> 전체글보기
      </Link>

      {boardGroups.map((g) => (
        <div key={g.id} className="border-t border-gray-100 py-1.5">
          <p className="px-5 py-1 text-xs font-semibold text-gray-400">{g.name}</p>
          <ul>
            {g.boards.map((b) => {
              const active = isActive(pathname, `/board/${b.slug}`);
              return (
                <li key={b.id}>
                  <Link
                    href={`/board/${b.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      // 선택된 메뉴는 왼쪽에 색 막대를 둔다 — 글자만 굵게 하면 눈에 안 띈다
                      "flex items-center justify-between border-l-2 py-1.5 pl-[18px] pr-5 text-sm transition",
                      active
                        ? "border-ocean-600 bg-ocean-50 font-semibold text-ocean-700"
                        : "border-transparent text-gray-700 hover:bg-ocean-50 hover:text-ocean-700",
                    )}
                  >
                    <span>{b.name}</span>
                    {b.hasNewPost && (
                      <span className="rounded-full bg-coral-500 px-1.5 text-[10px] font-bold leading-4 text-white">
                        N
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
