import { Search, Map } from "lucide-react";
import type { Difficulty, Region } from "@/types";
import { getPoints } from "@/lib/data";
import { PointCard } from "@/components/diving/PointCard";
import { FilterChip, PageTitle } from "@/components/ui";

export const metadata = { title: "다이빙 포인트" };

const REGIONS: Region[] = ["동해", "남해", "제주", "서해", "해외"];
const DIFFS: Difficulty[] = ["초급", "중급", "상급"];

export default async function PointsPage({ searchParams }: { searchParams: Promise<{ region?: Region; difficulty?: Difficulty; q?: string }> }) {
  const { region, difficulty, q } = await searchParams;
  const points = getPoints({ region, difficulty, q });

  const href = (next: { region?: string; difficulty?: string }) => {
    const sp = new URLSearchParams();
    const merged = { region, difficulty, q, ...next };
    Object.entries(merged).forEach(([k, v]) => v && sp.set(k, v));
    const s = sp.toString();
    return `/points${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <PageTitle title="다이빙 포인트" desc="국내외 포인트의 수심, 시야, 월별 수온과 다이버 리뷰를 확인하세요." />

      {/* 지도 자리 */}
      <div className="grad-lagoon relative mb-4 flex h-44 items-center justify-center overflow-hidden rounded-xl text-white">
        <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden>
          <defs>
            <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M28 0H0V28" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {points.map((p, i) => (
          <span key={p.id} className="absolute h-3 w-3 rounded-full border-2 border-white bg-coral-500 shadow" style={{ left: `${12 + ((i * 37) % 76)}%`, top: `${20 + ((i * 23) % 60)}%` }} title={p.name} />
        ))}
        <div className="relative flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-sm backdrop-blur">
          <Map size={16} /> 지도 영역 (추후 카카오맵 / 구글맵 연동)
        </div>
      </div>

      <div className="mb-5 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <form action="/points" className="flex gap-2">
          {region && <input type="hidden" name="region" value={region} />}
          {difficulty && <input type="hidden" name="difficulty" value={difficulty} />}
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 focus-within:border-ocean-400">
            <Search size={16} className="text-gray-400" />
            <input name="q" defaultValue={q} placeholder="포인트명 또는 지역 (예: 서귀포, 고성)" className="w-full py-2 text-sm outline-none" />
          </label>
          <button className="rounded-lg bg-ocean-600 px-4 text-sm font-semibold text-white">검색</button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-10 text-xs font-semibold text-gray-500">지역</span>
          <FilterChip href={href({ region: undefined })} active={!region}>전체</FilterChip>
          {REGIONS.map((r) => <FilterChip key={r} href={href({ region: r })} active={region === r}>{r}</FilterChip>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-10 text-xs font-semibold text-gray-500">난이도</span>
          <FilterChip href={href({ difficulty: undefined })} active={!difficulty}>전체</FilterChip>
          {DIFFS.map((d) => <FilterChip key={d} href={href({ difficulty: d })} active={difficulty === d}>{d}</FilterChip>)}
        </div>
      </div>

      <p className="mb-3 text-sm text-gray-500">총 <b className="text-gray-900">{points.length}</b>개 포인트</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {points.map((p) => <PointCard key={p.id} point={p} />)}
      </div>
      {points.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-400">조건에 맞는 포인트가 없어요. 🐡</p>}
    </div>
  );
}
