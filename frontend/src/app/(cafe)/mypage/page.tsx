import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, Award, CalendarDays, Bookmark } from "lucide-react";

import { apiGet } from "@/lib/api";
import { authHeaders, getCurrentProfile, getDiveStats } from "@/lib/session";
import { Avatar, Card, LevelBadge, SectionHeader, Thumb } from "@/components/ui";
import { PostTable } from "@/components/board/PostTable";
import { formatNumber } from "@/lib/utils";
import type { ListPost } from "@/types";

export const metadata = { title: "마이페이지" };

export default async function MyPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/login?next=/mypage");
  // 내 글·스크랩·활동 요약은 전부 DB 에서 읽는다.
  // 세 요청이 서로를 기다릴 이유가 없어 같이 보낸다.
  const headers = await authHeaders();
  const [stats, myPosts, scraps, summary] = await Promise.all([
    getDiveStats(me.id),
    apiGet<{ items: ListPost[]; total: number }>("/me/posts?size=10", headers),
    apiGet<{ items: ListPost[]; total: number }>("/me/scraps?size=10", headers),
    apiGet<{ postCount: number; commentCount: number; receivedLikes: number }>(
      "/me/summary",
      headers,
    ),
  ]);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <Thumb gradient="lagoon" className="h-28" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end gap-4">
            <div className="rounded-full border-4 border-white"><Avatar user={me} size={80} /></div>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">{me.nickname} <LevelBadge level={me.level} /></h1>
              <p className="mt-0.5 flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Award size={12} /> {me.certAgency} {me.certLevel}</span>
                <span className="flex items-center gap-1"><CalendarDays size={12} /> {me.joinedAt.replaceAll("-", ".")} 가입</span>
              </p>
            </div>
            <Link href="/mypage/edit" className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"><Settings size={15} /> 프로필 수정</Link>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[
              { k: "다이빙", v: `${stats.totalDives}회` },
              { k: "작성글", v: summary?.postCount ?? 0 },
              { k: "댓글", v: summary?.commentCount ?? 0 },
              { k: "받은 좋아요", v: formatNumber(summary?.receivedLikes ?? 0) },
            ].map((x) => (
              <div key={x.k} className="rounded-lg bg-gray-50 py-3">
                <dt className="text-xs text-gray-400">{x.k}</dt>
                <dd className="text-lg font-extrabold text-gray-900">{x.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <Card>
        <SectionHeader title="🏅 등급 안내" sub="활동에 따라 자동 승급" />
        <ol className="grid grid-cols-2 gap-px bg-gray-100 text-center text-xs sm:grid-cols-5">
          {[
            { l: "새싹", c: "가입 즉시" },
            { l: "물방울", c: "글 5 · 댓글 20" },
            { l: "파도", c: "글 20 · 방문 30일" },
            { l: "산호", c: "글 50 · 로그 100" },
            { l: "고래", c: "글 150 · 로그 500" },
          ].map((g) => (
            <li key={g.l} className={`bg-white px-3 py-4 ${g.l === me.level ? "ring-2 ring-inset ring-ocean-500" : ""}`}>
              <LevelBadge level={g.l as typeof me.level} />
              <p className="mt-1.5 text-gray-500">{g.c}</p>
            </li>
          ))}
        </ol>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-gray-900">내가 쓴 글</h2>
          {myPosts && myPosts.total > 0 && (
            <span className="text-xs text-gray-400">{myPosts.total}건</span>
          )}
        </div>
        {myPosts && myPosts.items.length > 0 ? (
          <PostTable items={myPosts.items} showBoard />
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white py-10 text-center text-sm text-gray-400">
            아직 쓴 글이 없어요.{" "}
            <Link href="/write" className="font-semibold text-ocean-600 hover:underline">
              첫 글 남기기
            </Link>
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-gray-900">
            <Bookmark size={15} /> 내 스크랩
          </h2>
          {scraps && scraps.total > 0 && (
            <span className="text-xs text-gray-400">{scraps.total}건</span>
          )}
        </div>
        {scraps && scraps.items.length > 0 ? (
          <PostTable items={scraps.items} showBoard />
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white py-10 text-center text-sm text-gray-400">
            아직 스크랩한 글이 없어요. 글 아래 북마크를 눌러 모아두세요 🔖
          </p>
        )}
      </section>
    </div>
  );
}
