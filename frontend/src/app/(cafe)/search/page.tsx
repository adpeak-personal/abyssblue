import { Search } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { DivePoint, ListPost } from "@/types";
import { PostTable } from "@/components/board/PostTable";
import { PointCard } from "@/components/diving/PointCard";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "검색" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  // 글과 포인트를 같이 찾는다 — 서로 기다릴 이유가 없어 함께 보낸다
  const [postList, pointList] = q
    ? await Promise.all([
        apiGet<{ items: ListPost[]; total: number }>(`/posts?q=${encodeURIComponent(q)}&size=30`),
        apiGet<DivePoint[]>(`/points?q=${encodeURIComponent(q)}`),
      ])
    : [null, null];
  const posts = postList?.items ?? [];
  const points = pointList ?? [];

  return (
    <div className="space-y-6">
      <PageTitle title={q ? `'${q}' 검색 결과` : "검색"} desc={q ? `게시글 ${posts.length}건 · 포인트 ${points.length}건` : "포인트, 게시글, 장비를 검색해 보세요."} />
      <form action="/search" className="flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-ocean-400">
          <Search size={16} className="text-gray-400" />
          <input name="q" defaultValue={q} placeholder="예: 고성, 나이트록스, BCD" className="w-full py-2.5 text-sm outline-none" />
        </label>
        <button className="rounded-lg bg-ocean-600 px-4 text-sm font-semibold text-white">검색</button>
      </form>
      {points.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-gray-900">다이빙 포인트</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{points.map((p) => <PointCard key={p.id} point={p} />)}</div>
        </section>
      )}
      {q && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-gray-900">게시글</h2>
          <PostTable items={posts} showBoard />
        </section>
      )}
    </div>
  );
}
