import { Search } from "lucide-react";
import { apiGet } from "@/lib/api";
import { authHeaders } from "@/lib/session";
import { FilterChip } from "@/components/ui";
import { Pagination } from "@/components/board/Pagination";
import { PostAdminTable, type AdminPost } from "./PostAdminTable";
import type { BoardGroup } from "@/types";

export const metadata = { title: "게시글 관리" };

const SIZE = 30;

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{
    board?: string;
    q?: string;
    scope?: string;
    view?: string;
    page?: string;
  }>;
}) {
  const { board, q, scope, view, page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  const sp = new URLSearchParams({ page: String(page), size: String(SIZE) });
  if (board) sp.set("boardSlug", board);
  if (q) {
    sp.set("q", q);
    if (scope) sp.set("scope", scope);
  }
  if (view === "deleted") sp.set("includeDeleted", "true");
  if (view === "notice") sp.set("onlyNotice", "true");

  const headers = await authHeaders();
  const [list, boardGroups] = await Promise.all([
    apiGet<{ items: AdminPost[]; total: number }>(`/admin/posts?${sp}`, headers),
    apiGet<BoardGroup[]>("/boards"),
  ]);

  if (!list || !boardGroups) {
    return (
      <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        게시글 목록을 불러오지 못했습니다. 백엔드(5030)가 실행 중인지 확인해 주세요.
      </p>
    );
  }

  const href = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    Object.entries({ board, q, scope, view, ...next }).forEach(([k, v]) => v && params.set(k, v));
    const s = params.toString();
    return `/admin/posts${s ? `?${s}` : ""}`;
  };

  const allBoards = boardGroups.flatMap((g) => g.boards);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">게시글 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          공지로 올리거나, 엉뚱한 게시판의 글을 옮기거나, 삭제합니다. 삭제한 글은 복구할 수 있어요.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form action="/admin/posts" className="flex min-w-60 flex-1 gap-2">
          {board && <input type="hidden" name="board" value={board} />}
          {view && <input type="hidden" name="view" value={view} />}
          <select
            name="scope"
            defaultValue={scope ?? "title_content"}
            className="rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-600"
          >
            <option value="title_content">제목+내용</option>
            <option value="author">작성자</option>
          </select>
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-ocean-400">
            <Search size={15} className="text-gray-400" />
            <input name="q" defaultValue={q} placeholder="검색어" className="w-full py-2 text-sm outline-none" />
          </label>
          <button className="rounded-lg bg-gray-800 px-3 text-sm text-white">검색</button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip href={href({ view: undefined, page: undefined })} active={!view}>
          전체
        </FilterChip>
        <FilterChip href={href({ view: "notice", page: undefined })} active={view === "notice"}>
          공지만
        </FilterChip>
        <FilterChip href={href({ view: "deleted", page: undefined })} active={view === "deleted"}>
          삭제 포함
        </FilterChip>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        <FilterChip href={href({ board: undefined, page: undefined })} active={!board}>
          모든 게시판
        </FilterChip>
        {allBoards.map((b) => (
          <FilterChip
            key={b.slug}
            href={href({ board: b.slug, page: undefined })}
            active={board === b.slug}
          >
            {b.name}
          </FilterChip>
        ))}
      </div>

      <p className="text-xs text-gray-400">총 {list.total}건</p>

      <PostAdminTable posts={list.items} boardGroups={boardGroups} />

      <Pagination page={page} total={list.total} size={SIZE} makeHref={(p) => href({ page: String(p) })} />
    </div>
  );
}
