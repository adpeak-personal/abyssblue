import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { getSessionUser, isAdmin } from "@/lib/session";

export const metadata = { title: { default: "어드민", template: "%s | 어드민" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 레이아웃에서 한 번에 막는다 — 페이지를 추가할 때 가드를 빠뜨리지 않도록.
  // 서버(API)도 따로 막고 있으므로 이건 화면 차원의 안내다.
  const me = await getSessionUser();
  if (!me) redirect("/login?next=/admin");
  if (!isAdmin(me)) redirect("/");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 bg-ocean-950 text-white">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/admin" className="flex shrink-0 items-center gap-2 font-extrabold lg:w-52">
            <span className="rounded bg-ocean-500 px-1.5 py-0.5 text-xs">ADMIN</span>
            어비스 블루
          </Link>

          <p className="flex min-w-0 flex-1 items-center gap-2 text-xs text-gray-300">
            <span className="truncate">{me.nickname} · 운영진</span>
          </p>

          <Link href="/" className="flex shrink-0 items-center gap-1 text-xs text-gray-300 hover:text-white">
            <ExternalLink size={13} /> 사이트 보기
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <AdminNav />
        <main className="min-w-0 flex-1 bg-gray-50 px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
