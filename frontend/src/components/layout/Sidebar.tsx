import Link from "next/link";
import { PenSquare, BookOpen, MapPinned, CalendarDays, List, ChevronRight } from "lucide-react";
import { boardGroups, posts, CAFE_INFO } from "@/data/mock";
import { getCurrentUser, getLogStats, getPoints } from "@/lib/data";
import { Avatar, LevelBadge } from "@/components/ui";
import { formatNumber } from "@/lib/utils";

const TOOLS = [
  { href: "/points", label: "다이빙 포인트", icon: MapPinned },
  { href: "/logbook", label: "나의 로그북", icon: BookOpen },
  { href: "/tours", label: "투어 · 번개 모집", icon: CalendarDays },
];

export function Sidebar() {
  const me = getCurrentUser();
  const stats = getLogStats(me.id);
  const myPostCount = posts.filter((p) => p.authorId === me.id).length;
  const isNew = (slug: string) => posts.some((p) => p.boardSlug === slug && p.createdAt >= "2026-09-14");
  const todayPosts = posts.filter((p) => p.createdAt >= "2026-09-15").length;

  return (
    <aside className="hidden w-60 shrink-0 space-y-3 lg:block">
      {/* 내 프로필 */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <Link href="/mypage" className="group flex items-center gap-3">
          <Avatar user={me} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900 group-hover:text-ocean-700">{me.nickname}</p>
            <p className="mt-0.5 truncate text-[11px] text-gray-400">{me.certAgency} {me.certLevel}</p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-gray-300" />
        </Link>

        <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
          <LevelBadge level={me.level} />
          <dl className="flex gap-3 text-[11px] text-gray-500">
            <div className="flex items-center gap-1">
              <dt>로그</dt>
              <dd className="font-bold text-gray-900">{stats.totalDives}</dd>
            </div>
            <div className="flex items-center gap-1">
              <dt>글</dt>
              <dd className="font-bold text-gray-900">{myPostCount}</dd>
            </div>
          </dl>
        </div>

        <Link href="/write" className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-ocean-600 py-2.5 text-sm font-semibold text-white hover:bg-ocean-700">
          <PenSquare size={15} /> 글쓰기
        </Link>
      </section>

      {/* 다이버 도구 */}
      <nav className="rounded-xl border border-gray-200 bg-white p-2">
        <ul>
          {TOOLS.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-ocean-50 hover:text-ocean-700">
                <t.icon size={17} className="text-ocean-500" />
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* 게시판 */}
      <nav className="rounded-xl border border-gray-200 bg-white py-2">
        <Link href="/board/all" className="mx-2 mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 hover:bg-gray-50">
          <List size={16} className="text-gray-400" /> 전체글보기
        </Link>
        {boardGroups.map((g) => (
          <div key={g.id} className="border-t border-gray-100 py-1.5">
            <p className="px-5 py-1 text-xs font-semibold text-gray-400">{g.name}</p>
            <ul>
              {g.boards.map((b) => (
                <li key={b.id}>
                  <Link href={`/board/${b.slug}`} className="flex items-center justify-between px-5 py-1.5 text-sm text-gray-700 hover:bg-ocean-50 hover:text-ocean-700">
                    <span>{b.name}</span>
                    {isNew(b.slug) && <span className="rounded-full bg-coral-500 px-1.5 text-[10px] font-bold leading-4 text-white">N</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* 커뮤니티 현황 */}
      <section className="rounded-xl border border-gray-200 bg-white px-4 py-3">
        <dl className="space-y-1.5 text-[13px]">
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">활동 다이버</dt>
            <dd className="font-bold text-gray-900">{formatNumber(CAFE_INFO.memberCount)}명</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">오늘 새 글</dt>
            <dd className="font-bold text-ocean-600">{todayPosts}개</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">등록 포인트</dt>
            <dd className="font-bold text-gray-900">{getPoints().length}곳</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}
