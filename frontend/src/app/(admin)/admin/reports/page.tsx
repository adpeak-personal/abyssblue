import { apiGet } from "@/lib/api";
import { authHeaders } from "@/lib/session";
import { FilterChip } from "@/components/ui";
import { Pagination } from "@/components/board/Pagination";
import { ReportList } from "./ReportList";
import type { Report } from "@/types/member";

export const metadata = { title: "신고 처리" };

const SIZE = 30;
const TABS = ["접수", "처리완료", "반려"] as const;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  const sp = new URLSearchParams({ page: String(page), size: String(SIZE) });
  if (status) sp.set("status", status);

  const list = await apiGet<{ items: Report[]; total: number }>(
    `/admin/reports?${sp}`,
    await authHeaders(),
  );

  if (!list) {
    return (
      <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        신고 목록을 불러오지 못했습니다. 백엔드(5030)가 실행 중인지 확인해 주세요.
      </p>
    );
  }

  const href = (next: { status?: string; page?: string }) => {
    const params = new URLSearchParams();
    Object.entries({ status, ...next }).forEach(([k, v]) => v && params.set(k, v));
    const s = params.toString();
    return `/admin/reports${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">신고 처리</h1>
        <p className="mt-1 text-sm text-gray-500">
          접수된 신고를 확인하고 처리합니다. 글·댓글 삭제는 원문에서 직접 해주세요.
        </p>
      </div>

      <div className="flex gap-2">
        <FilterChip href={href({ status: undefined, page: undefined })} active={!status}>
          전체
        </FilterChip>
        {TABS.map((t) => (
          <FilterChip key={t} href={href({ status: t, page: undefined })} active={status === t}>
            {t}
          </FilterChip>
        ))}
      </div>

      <p className="text-xs text-gray-400">총 {list.total}건</p>

      <ReportList reports={list.items} />

      <Pagination page={page} total={list.total} size={SIZE} makeHref={(p) => href({ page: String(p) })} />
    </div>
  );
}
