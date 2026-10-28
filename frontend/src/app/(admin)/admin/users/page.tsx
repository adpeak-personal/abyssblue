import { Search } from "lucide-react";
import { apiGet } from "@/lib/api";
import { authHeaders, getSessionUser } from "@/lib/session";
import { Pagination } from "@/components/board/Pagination";
import { MemberTable } from "./MemberTable";
import { MEMBER_LEVELS, MEMBER_STATUSES, type Member } from "@/types/member";

export const metadata = { title: "회원 관리" };

const SIZE = 30;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; status?: string; page?: string }>;
}) {
  const { q, level, status, page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  const sp = new URLSearchParams({ page: String(page), size: String(SIZE) });
  if (q) sp.set("q", q);
  if (level) sp.set("level", level);
  if (status) sp.set("status", status);

  const [me, list] = await Promise.all([
    getSessionUser(),
    apiGet<{ items: Member[]; total: number }>(`/admin/members?${sp}`, await authHeaders()),
  ]);

  if (!list) {
    return (
      <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        회원 목록을 불러오지 못했습니다. 백엔드(5030)가 실행 중인지 확인해 주세요.
      </p>
    );
  }

  /** 필터를 바꿀 때 나머지 조건은 유지하고 페이지만 1로 돌린다 */
  const href = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    Object.entries({ q, level, status, ...next }).forEach(([k, v]) => v && params.set(k, v));
    const s = params.toString();
    return `/admin/users${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">회원 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          등급을 바꾸거나 이용을 정지합니다. 정지·탈퇴해도 글과 댓글은 그대로 남습니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form action="/admin/users" className="flex min-w-60 flex-1 gap-2">
          {level && <input type="hidden" name="level" value={level} />}
          {status && <input type="hidden" name="status" value={status} />}
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-ocean-400">
            <Search size={15} className="text-gray-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="닉네임 또는 이메일"
              className="w-full py-2 text-sm outline-none"
            />
          </label>
          <button className="rounded-lg bg-gray-800 px-3 text-sm text-white">검색</button>
        </form>

        <div className="flex gap-1.5">
          <FilterSelect name="등급" value={level} options={MEMBER_LEVELS} hrefFor={(v) => href({ level: v, page: undefined })} />
          <FilterSelect name="상태" value={status} options={[...MEMBER_STATUSES]} hrefFor={(v) => href({ status: v, page: undefined })} />
        </div>
      </div>

      <p className="text-xs text-gray-400">총 {list.total}명</p>

      <MemberTable members={list.items} myId={me?.id ?? 0} />

      <Pagination
        page={page}
        total={list.total}
        size={SIZE}
        makeHref={(p) => href({ page: String(p) })}
      />
    </div>
  );
}

/**
 * 링크로 된 필터.
 *
 * select 로 만들면 클라이언트 컴포넌트가 되어야 해서, 이 화면에선 링크 목록으로 둔다.
 */
function FilterSelect({
  name,
  value,
  options,
  hrefFor,
}: {
  name: string;
  value?: string;
  options: string[];
  hrefFor: (v: string | undefined) => string;
}) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
        {value ?? `${name} 전체`}
      </summary>
      <ul className="absolute right-0 z-10 mt-1 w-32 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
        <li>
          <a href={hrefFor(undefined)} className="block px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            전체
          </a>
        </li>
        {options.map((o) => (
          <li key={o}>
            <a href={hrefFor(o)} className="block px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
              {o}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
