import Link from "next/link";
import { MapPin, Star, ArrowDownToLine, Eye } from "lucide-react";
import type { DivePoint } from "@/types";
import { Tag, Thumb } from "@/components/ui";

const DIFF_TONE = { 초급: "green", 중급: "ocean", 상급: "coral" } as const;

export function PointCard({ point: p }: { point: DivePoint }) {
  const thisMonth = p.waterTemp[8]; // 9월 기준 (더미)
  return (
    <Link href={`/points/${p.id}`} className="group block overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative">
        <Thumb gradient={p.gradient} className="h-36" />
        <div className="absolute left-3 top-3 flex gap-1">
          <Tag tone="dark">{p.region}</Tag>
          <Tag tone={DIFF_TONE[p.difficulty]}>{p.difficulty}</Tag>
        </div>
        <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-ocean-800">
          🌡 {thisMonth.temp}°C
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-900 group-hover:text-ocean-700">{p.name}</h3>
          <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-amber-500">
            <Star size={14} fill="currentColor" /> {p.rating}
            <span className="text-xs font-normal text-gray-400">({p.reviewCount})</span>
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
          <MapPin size={12} /> {p.country} · {p.area}
        </p>
        <div className="mt-3 flex gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1"><ArrowDownToLine size={13} /> {p.depthMin}~{p.depthMax}m</span>
          <span className="flex items-center gap-1"><Eye size={13} /> 시야 {p.visibility}</span>
        </div>
        <p className="mt-2 line-clamp-1 text-xs text-gray-400">{p.marineLife.join(" · ")}</p>
      </div>
    </Link>
  );
}
