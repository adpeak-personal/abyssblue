"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Flag,
  LayoutDashboard,
  ListTree,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Users;
  /** 아직 없는 화면 — 구조는 보여주되 누를 수 없게 */
  soon?: boolean;
}

// 아이콘 컴포넌트는 서버→클라이언트로 넘길 수 없어서 메뉴 정의를 이 파일에 둔다
const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "현황",
    items: [{ href: "/admin", label: "대시보드", icon: LayoutDashboard }],
  },
  {
    title: "콘텐츠",
    items: [
      { href: "/admin/boards", label: "게시판 관리", icon: ListTree },
      { href: "/admin/posts", label: "게시글 관리", icon: MessageSquare },
      { href: "/admin/reports", label: "신고 처리", icon: Flag },
    ],
  },
  {
    title: "회원",
    items: [{ href: "/admin/users", label: "회원 관리", icon: Users }],
  },
  {
    title: "기타",
    items: [
      { href: "/admin/stats", label: "통계", icon: BarChart3, soon: true },
      { href: "/admin/settings", label: "사이트 설정", icon: Settings, soon: true },
    ],
  },
];

const isActive = (pathname: string, href: string) =>
  href === "/admin" ? pathname === href : pathname.startsWith(href);

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {/* 데스크톱 — 좌측 사이드바 */}
      <nav className="hidden w-52 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="sticky top-0 space-y-5 px-3 py-5">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-gray-400">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon, soon }) => {
                  const active = isActive(pathname, href);
                  return (
                    <li key={href}>
                      {soon ? (
                        // 아직 없는 화면 — 구조는 보여주되 누를 수 없게
                        <span
                          aria-disabled
                          className="flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300"
                        >
                          <Icon size={15} />
                          {label}
                          <span className="ml-auto text-[10px] text-gray-300">준비중</span>
                        </span>
                      ) : (
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            // 선택 표시는 사이트 사이드바와 같은 방식 — 왼쪽 색 막대 + 연한 배경
                            "flex items-center gap-2 rounded-lg border-l-2 py-2 pl-2.5 pr-3 text-sm transition",
                            active
                              ? "border-ocean-600 bg-ocean-50 font-semibold text-ocean-700"
                              : "border-transparent text-gray-600 hover:bg-gray-100",
                          )}
                        >
                          <Icon size={15} />
                          {label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* 모바일 — 가로 스크롤 탭 (준비중 항목은 뺀다) */}
      <nav className="scrollbar-none flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2 lg:hidden">
        {SECTIONS.flatMap((s) => s.items)
          .filter((i) => !i.soon)
          .map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
                  active ? "bg-ocean-50 font-semibold text-ocean-700" : "text-gray-600",
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
      </nav>
    </>
  );
}
