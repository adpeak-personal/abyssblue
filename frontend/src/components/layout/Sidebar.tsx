import Link from "next/link";
import { PenSquare, ChevronRight } from "lucide-react";
import { apiGet } from "@/lib/api";
import { authHeaders, getCurrentProfile, getDiveStats } from "@/lib/session";
import type { BoardGroup } from "@/types";
import { Avatar, LevelBadge } from "@/components/ui";
import { SidebarBoards, SidebarTools } from "./SidebarNav";
import { formatNumber } from "@/lib/utils";

interface Overview {
  name: string;
  memberCount: number;
  todayPosts: number;
  pointCount: number;
}

export async function Sidebar() {
  const me = await getCurrentProfile();

  // 서로 기다릴 이유가 없어 같이 보낸다. 로그인 전이면 개인 정보는 건너뛴다
  const headers = await authHeaders();
  const [stats, boardGroups, overview, summary] = await Promise.all([
    me ? getDiveStats(me.id) : null,
    apiGet<BoardGroup[]>("/boards"),
    apiGet<Overview>("/cafe"),
    me ? apiGet<{ postCount: number }>("/me/summary", headers) : null,
  ]);

  return (
    <aside className="hidden w-60 shrink-0 space-y-3 lg:block">
      {/* 내 프로필 — 로그인 전에는 로그인 안내 */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        {me && stats ? (
          <>
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
                  <dd className="font-bold text-gray-900">{summary?.postCount ?? 0}</dd>
                </div>
              </dl>
            </div>

            <Link href="/write" className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-ocean-600 py-2.5 text-sm font-semibold text-white hover:bg-ocean-700">
              <PenSquare size={15} /> 글쓰기
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-gray-900">로그인하고 함께해요 🤿</p>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
              글쓰기·로그북·사진 업로드는 로그인 후 이용할 수 있어요.
            </p>
            <Link href="/login" className="mt-3 flex items-center justify-center rounded-lg bg-ocean-600 py-2.5 text-sm font-semibold text-white hover:bg-ocean-700">
              로그인
            </Link>
            <Link href="/signup" className="mt-2 flex items-center justify-center rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              회원가입
            </Link>
          </>
        )}
      </section>

      <SidebarTools />

      <SidebarBoards boardGroups={boardGroups ?? []} />

      {/* 커뮤니티 현황 */}
      <section className="rounded-xl border border-gray-200 bg-white px-4 py-3">
        <dl className="space-y-1.5 text-[13px]">
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">활동 다이버</dt>
            <dd className="font-bold text-gray-900">{formatNumber(overview?.memberCount ?? 0)}명</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">오늘 새 글</dt>
            <dd className="font-bold text-ocean-600">{overview?.todayPosts ?? 0}개</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">등록 포인트</dt>
            <dd className="font-bold text-gray-900">{overview?.pointCount ?? 0}곳</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}
