import Link from "next/link";
import { Plus } from "lucide-react";
import { apiGet } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { TourCard, type TourWithHost } from "@/components/diving/TourCard";
import { FilterChip, PageTitle } from "@/components/ui";

export const metadata = { title: "투어 · 모집" };

const TYPES = ["번개", "정기투어", "해외투어", "교육"];

/** 투어를 열 수 있는 등급 — 백엔드도 같은 조건을 다시 확인한다 */
const CAN_OPEN = ["강사", "운영진"];

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; denied?: string }>;
}) {
  const { type, denied } = await searchParams;
  const me = await getSessionUser();
  const canOpen = me ? CAN_OPEN.includes(me.level) : false;
  const tours =
    (await apiGet<TourWithHost[]>(`/tours${type ? `?type=${encodeURIComponent(type)}` : ""}`)) ?? [];
  const open = tours.filter((t) => t.status !== "마감");
  const closed = tours.filter((t) => t.status === "마감");

  return (
    <div>
      <PageTitle
        title="투어 · 번개 모집"
        desc="정기투어, 번개 다이빙, 해외 트립, 교육 과정을 함께할 다이버를 모아요."
        action={
          canOpen ? (
            <Link
              href="/tours/new"
              className="flex items-center gap-1 rounded-lg bg-ocean-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-ocean-700"
            >
              <Plus size={16} /> 투어 열기
            </Link>
          ) : undefined
        }
      />

      {denied && (
        <p className="mb-4 rounded-xl border border-coral-200 bg-coral-50 px-4 py-3 text-sm text-coral-800">
          투어는 강사 등급부터 열 수 있어요. 강사 등급은 운영진이 자격을 확인한 뒤 부여합니다.
        </p>
      )}

      <div className="scrollbar-none mb-5 flex gap-2 overflow-x-auto">
        <FilterChip href="/tours" active={!type}>전체</FilterChip>
        {TYPES.map((t) => <FilterChip key={t} href={`/tours?type=${encodeURIComponent(t)}`} active={type === t}>{t}</FilterChip>)}
      </div>

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ⚠️ 참여 전 최소 자격 조건과 로그 수를 확인해주세요. 번개 다이빙은 개인 책임 하에 진행되며, 반드시 버디 시스템을 지켜주세요.
      </div>

      {tours.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white py-14 text-center text-sm text-gray-400">
          모집 중인 투어가 없어요.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {open.map((t) => <TourCard key={t.id} tour={t} />)}
      </div>

      {closed.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-bold text-gray-500">마감된 모집</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {closed.map((t) => <TourCard key={t.id} tour={t} />)}
          </div>
        </>
      )}
    </div>
  );
}
