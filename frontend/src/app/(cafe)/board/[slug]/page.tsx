import Link from "next/link";
import { notFound } from "next/navigation";
import { PenSquare, Search } from "lucide-react";
import { getBoard, getNotices, getPosts } from "@/lib/data";
import { PostTable } from "@/components/board/PostTable";
import { GalleryGrid } from "@/components/board/GalleryGrid";
import { Pagination } from "@/components/board/Pagination";
import { FilterChip } from "@/components/ui";

const ALL_BOARD = { slug: "all", name: "전체글보기", description: "모든 게시판의 최신 글", type: "list" as const, categories: undefined };

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam, category, q } = await searchParams;
  const board = slug === "all" ? ALL_BOARD : getBoard(slug);
  if (!board) notFound();

  const page = Number(pageParam) || 1;
  const size = board.type === "gallery" ? 12 : 15;
  const { items, total } = getPosts({ boardSlug: slug === "all" ? undefined : slug, category, q, page, size });
  const notices = slug === "notice" || board.type === "gallery" || page > 1 ? [] : getNotices(2);

  const qs = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { category, q, ...next };
    Object.entries(merged).forEach(([k, v]) => v && sp.set(k, v));
    const s = sp.toString();
    return `/board/${slug}${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b-2 border-ocean-800 pb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{board.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{board.description}</p>
        </div>
        <Link href={`/write?board=${slug === "all" ? "free" : slug}`} className="flex items-center gap-1 rounded-lg bg-ocean-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-ocean-700">
          <PenSquare size={15} /> 글쓰기
        </Link>
      </div>

      {board.categories && (
        <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto">
          <FilterChip href={qs({ category: undefined, page: undefined })} active={!category}>전체</FilterChip>
          {board.categories.map((c) => (
            <FilterChip key={c} href={qs({ category: c, page: undefined })} active={category === c}>{c}</FilterChip>
          ))}
        </div>
      )}

      {board.type === "gallery" ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <GalleryGrid items={items} />
          {items.length === 0 && <p className="py-16 text-center text-sm text-gray-400">등록된 게시글이 없습니다.</p>}
        </div>
      ) : (
        <PostTable items={items} notices={notices} showBoard={slug === "all"} />
      )}

      <Pagination page={page} total={total} size={size} makeHref={(p) => qs({ page: String(p) })} />

      <form className="mx-auto mt-5 flex max-w-md gap-2" action={`/board/${slug}`}>
        <select name="field" className="rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-600">
          <option>제목+내용</option>
          <option>작성자</option>
        </select>
        <input name="q" defaultValue={q} placeholder="게시판 내 검색" className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400" />
        <button className="rounded-lg bg-gray-800 px-3 text-white" aria-label="검색"><Search size={16} /></button>
      </form>
    </div>
  );
}
