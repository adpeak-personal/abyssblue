import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MapPin, Award, Users, Wallet, ChevronLeft } from "lucide-react";

import { apiGet } from "@/lib/api";
import { authHeaders, getSessionUser } from "@/lib/session";
import { Card, SectionHeader, Tag, UserChip } from "@/components/ui";
import { TourJoin, type MyStatus } from "@/components/diving/TourJoin";
import { TourParticipants, type TourParticipant } from "@/components/diving/TourParticipants";
import type { TourWithHost } from "@/components/diving/TourCard";
import { formatPrice } from "@/lib/utils";

type TourDetail = TourWithHost & { myStatus: MyStatus };

const TYPE_TONE = { 번개: "coral", 정기투어: "ocean", 해외투어: "dark", 교육: "green" } as const;

const period = (t: TourDetail) =>
  t.startDate === t.endDate ? t.startDate : `${t.startDate} ~ ${t.endDate}`;

/** 탭 제목과 공유 미리보기에 투어 제목이 뜨도록 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tour = await apiGet<TourDetail>(`/tours/${id}`);
  return tour ? { title: `${tour.title} · 투어` } : { title: "투어" };
}

export default async function TourDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = await authHeaders();
  const me = await getSessionUser();

  const tour = await apiGet<TourDetail>(`/tours/${id}`, headers);
  if (!tour) notFound();

  // 참가자 명단은 로그인한 사람에게만 — 누가 가는지는 회원끼리 보는 정보다
  const participants = me
    ? ((await apiGet<TourParticipant[]>(`/tours/${id}/participants`, headers)) ?? [])
    : [];

  const isHost = me?.id === tour.hostId;
  const canManage = isHost || me?.level === "운영진";
  const pct = Math.min(100, Math.round((tour.joined / tour.capacity) * 100));

  return (
    <div className="space-y-4">
      <Link href="/tours" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft size={15} /> 투어 목록
      </Link>

      <Card>
        <div className="flex items-center gap-1.5">
          <Tag tone={TYPE_TONE[tour.type]}>{tour.type}</Tag>
          <span
            className={`text-xs font-bold ${
              tour.status === "마감임박"
                ? "text-coral-500"
                : tour.status === "마감"
                  ? "text-gray-400"
                  : "text-ocean-600"
            }`}
          >
            {tour.status}
          </span>
          <span className="ml-auto text-xs text-gray-400">
            {tour.joinMode === "승인제" ? "주최자 승인" : "선착순"}
          </span>
        </div>

        <h1 className="mt-2 text-xl font-bold text-gray-900">{tour.title}</h1>

        <dl className="mt-4 grid gap-2.5 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 text-gray-600">
            <CalendarDays size={15} className="shrink-0 text-gray-400" /> {period(tour)}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin size={15} className="shrink-0 text-gray-400" /> {tour.pointName} · {tour.region}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Award size={15} className="shrink-0 text-gray-400" />
            {tour.minCert ? `${tour.minCert} 이상` : "자격 제한 없음"}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Wallet size={15} className="shrink-0 text-gray-400" /> {formatPrice(tour.price)}
          </div>
        </dl>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-gray-500">
              <Users size={13} /> {tour.joined} / {tour.capacity}명
            </span>
            <span className="text-gray-400">{pct}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${pct >= 80 ? "bg-coral-500" : "bg-ocean-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 whitespace-pre-wrap border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-700">
          {tour.description}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-xs text-gray-400">주최</span>
          <UserChip user={tour.host} />
        </div>
      </Card>

      <Card>
        <TourJoin
          tourId={tour.id}
          myStatus={tour.myStatus}
          tourStatus={tour.status}
          joinMode={tour.joinMode}
          isHost={Boolean(isHost)}
          loggedIn={Boolean(me)}
        />
      </Card>

      {me && (
        <Card>
          <SectionHeader title="🙋 신청 현황" sub={`${participants.length}명`} />
          <TourParticipants
            tourId={tour.id}
            participants={participants}
            canManage={Boolean(canManage)}
            joinMode={tour.joinMode}
          />
        </Card>
      )}

      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        ⚠️ 참여 전 최소 자격 조건과 로그 수를 확인해주세요. 다이빙은 개인 책임 하에 진행되며,
        반드시 버디 시스템을 지켜주세요.
      </p>
    </div>
  );
}
