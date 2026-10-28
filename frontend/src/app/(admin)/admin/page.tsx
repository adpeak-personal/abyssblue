import Link from "next/link";
import { FileText, Flag, Image as ImageIcon, MessageCircle, Users } from "lucide-react";
import { apiGet } from "@/lib/api";
import { authHeaders } from "@/lib/session";
import { Avatar } from "@/components/ui";
import { VisitorPanel } from "@/components/admin/VisitorPanel";
import { formatNumber, formatRelative } from "@/lib/utils";
import type { AdminStats } from "@/types/admin";

export const metadata = { title: "대시보드" };

const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs text-gray-500">
        <Icon size={14} className="text-ocean-500" />
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-extrabold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default async function AdminDashboard() {
  const headers = await authHeaders();
  const [stats, reports] = await Promise.all([
    apiGet<AdminStats>("/admin/stats", headers),
    apiGet<{ pending: number }>("/admin/reports/pending", headers),
  ]);

  if (!stats) {
    return (
      <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        지표를 불러오지 못했습니다. 백엔드(5030)가 실행 중인지 확인해 주세요.
      </p>
    );
  }

  const { totals, recent7d, byBoard, recentPosts, recentUsers } = stats;
  const maxPostCount = Math.max(1, ...byBoard.map((b) => b.postCount));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">대시보드</h1>

      {/* 처리할 신고가 있으면 제일 먼저 보여 준다 — 묻히면 안 되는 일이다 */}
      {(reports?.pending ?? 0) > 0 && (
        <Link
          href="/admin/reports?status=접수"
          className="flex items-center gap-2 rounded-xl border border-coral-400 bg-orange-50 px-4 py-3 text-sm font-semibold text-coral-500 hover:brightness-95"
        >
          <Flag size={16} />
          처리하지 않은 신고 {reports!.pending}건
          <span className="ml-auto text-xs font-medium text-gray-500">바로 가기 →</span>
        </Link>
      )}

      <VisitorPanel />

      <h2 className="pt-1 text-sm font-bold text-gray-900">콘텐츠 현황</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="회원" value={formatNumber(totals.users)} sub={`최근 7일 +${recent7d.users}`} />
        <StatCard icon={FileText} label="게시글" value={formatNumber(totals.posts)} sub={`최근 7일 +${recent7d.posts}`} />
        <StatCard icon={MessageCircle} label="댓글" value={formatNumber(totals.comments)} sub={`최근 7일 +${recent7d.comments}`} />
        <StatCard
          icon={ImageIcon}
          label="업로드 이미지"
          value={formatNumber(totals.uploadFiles)}
          sub={formatBytes(totals.uploadBytes)}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* 게시판별 글 수 */}
        <section className="rounded-xl border border-gray-200 bg-white">
          <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-bold text-gray-900">게시판별 글 수</h2>
            <Link href="/admin/boards" className="text-xs text-ocean-600 hover:underline">
              게시판 관리 →
            </Link>
          </header>
          <ul className="divide-y divide-gray-50">
            {byBoard.map((b) => (
              <li key={b.slug} className="flex items-center gap-3 px-5 py-2">
                <Link href={`/board/${b.slug}`} className="w-28 shrink-0 truncate text-sm text-gray-800 hover:underline">
                  {b.name}
                </Link>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-ocean-400"
                    style={{ width: `${(b.postCount / maxPostCount) * 100}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-gray-500">{b.postCount}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 최근 가입 */}
        <section className="rounded-xl border border-gray-200 bg-white">
          <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-bold text-gray-900">최근 가입</h2>
          <ul className="divide-y divide-gray-50">
            {recentUsers.map((u) => (
              <li key={u.id} className="flex items-center gap-2.5 px-5 py-2.5">
                <Avatar user={u} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{u.nickname}</span>
                <span className="shrink-0 text-xs text-gray-400">{u.joinedAt.slice(2).replace(/-/g, ".")}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 최근 게시글 */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-bold text-gray-900">최근 게시글</h2>
        <ul className="divide-y divide-gray-50">
          {recentPosts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/board/${p.boardSlug}/${p.id}`}
                className="flex items-center gap-2 px-5 py-2.5 text-sm hover:bg-gray-50"
              >
                <span className="line-clamp-1 text-gray-800">{p.title}</span>
                {p.commentCount > 0 && (
                  <span className="shrink-0 text-xs font-bold text-coral-500">[{p.commentCount}]</span>
                )}
                <span className="ml-auto shrink-0 text-xs text-gray-400">{p.author?.nickname}</span>
                <span className="w-16 shrink-0 text-right text-xs text-gray-400">{formatRelative(p.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
