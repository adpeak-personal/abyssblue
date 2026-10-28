import { CalendarDays, MapPin, Award } from "lucide-react";
import type { Tour, PostAuthor } from "@/types";
import { Tag, UserChip } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

const TYPE_TONE = { 번개: "coral", 정기투어: "ocean", 해외투어: "dark", 교육: "green" } as const;

/** 목록 API 가 주최자를 함께 내려준다 */
export type TourWithHost = Tour & { host?: PostAuthor | null };

export function TourCard({ tour: t, compact }: { tour: TourWithHost; compact?: boolean }) {
  const host = t.host;
  const pct = Math.round((t.joined / t.capacity) * 100);
  const closed = t.status === "마감";
  return (
    <article className={`rounded-xl border border-gray-200 bg-white p-4 ${closed ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-1.5">
        <Tag tone={TYPE_TONE[t.type]}>{t.type}</Tag>
        <span className={`text-xs font-bold ${t.status === "마감임박" ? "text-coral-500" : closed ? "text-gray-400" : "text-ocean-600"}`}>{t.status}</span>
      </div>
      <h3 className="mt-2 line-clamp-1 font-bold text-gray-900">{t.title}</h3>
      <ul className="mt-2 space-y-1 text-xs text-gray-500">
        <li className="flex items-center gap-1.5"><CalendarDays size={13} /> {t.startDate.slice(5).replace("-", ".")}{t.endDate !== t.startDate && ` ~ ${t.endDate.slice(5).replace("-", ".")}`}</li>
        <li className="flex items-center gap-1.5"><MapPin size={13} /> {t.pointName}</li>
        {!compact && <li className="flex items-center gap-1.5"><Award size={13} /> {t.minCert} 이상</li>}
      </ul>
      <div className="mt-3">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">{t.joined}/{t.capacity}명</span>
          <span className="font-bold text-gray-900">{formatPrice(t.price)}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full rounded-full ${pct >= 80 ? "bg-coral-500" : "bg-ocean-500"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {!compact && (
        <>
          <p className="mt-3 line-clamp-2 text-sm text-gray-600">{t.description}</p>
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <UserChip user={host} />
            <button disabled={closed} className="rounded-lg bg-ocean-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-ocean-700 disabled:bg-gray-300">
              {closed ? "대기 신청" : "참여하기"}
            </button>
          </div>
        </>
      )}
    </article>
  );
}
