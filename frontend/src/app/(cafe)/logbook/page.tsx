import Link from "next/link";
import { Plus, ArrowDownToLine, Timer, Thermometer, Eye, Users, Star, Download } from "lucide-react";
import { getCurrentUser, getLogStats, getLogs } from "@/lib/data";
import { Card, PageTitle, SectionHeader, Tag } from "@/components/ui";

export const metadata = { title: "나의 로그북" };

export default function LogbookPage() {
  const me = getCurrentUser();
  const stats = getLogStats(me.id);
  const logs = getLogs(me.id);
  const maxDepthAll = Math.max(...logs.map((l) => l.maxDepth));

  return (
    <div className="space-y-5">
      <PageTitle
        title="나의 로그북"
        desc={`${me.certAgency} ${me.certLevel} · ${me.nickname}`}
        action={
          <div className="flex gap-2">
            <button className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"><Download size={15} /> 가져오기</button>
            <Link href="/logbook/new" className="flex items-center gap-1 rounded-lg bg-ocean-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-ocean-700"><Plus size={16} /> 새 로그</Link>
          </div>
        }
      />

      {/* 통계 */}
      <div className="grad-deep grid grid-cols-2 gap-px overflow-hidden rounded-2xl text-white sm:grid-cols-5">
        {[
          { label: "총 다이빙", value: stats.totalDives, unit: "회" },
          { label: "최대 수심", value: stats.maxDepth, unit: "m" },
          { label: "누적 시간(최근)", value: Math.round(stats.totalBottomTime / 60 * 10) / 10, unit: "시간" },
          { label: "평균 수온", value: stats.avgWaterTemp, unit: "°C" },
          { label: "방문 포인트", value: stats.pointsVisited, unit: "곳" },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 px-5 py-5">
            <p className="text-xs text-ocean-100">{s.label}</p>
            <p className="mt-1 text-2xl font-extrabold">{s.value}<span className="ml-0.5 text-sm font-medium opacity-80">{s.unit}</span></p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 수심 프로필 */}
        <Card>
          <SectionHeader title="최근 다이빙 최대수심" />
          <div className="flex h-48 items-start gap-1.5 px-4 pb-5 pt-4 sm:gap-3 sm:px-5">
            {[...logs].reverse().map((l) => (
              <div key={l.id} className="flex h-full min-w-0 flex-1 flex-col items-center">
                <span className="text-[10px] text-gray-400">#{l.diveNo}</span>
                <div className="relative mt-1 w-full flex-1 rounded bg-ocean-50">
                  <div className="absolute inset-x-0 top-0 rounded bg-gradient-to-b from-ocean-300 to-ocean-700" style={{ height: `${(l.maxDepth / Math.ceil(maxDepthAll / 10) / 10) * 100}%` }} />
                </div>
                <span className="mt-1 text-[11px] font-semibold text-ocean-800">{l.maxDepth}m</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 자격증 & 목표 */}
        <Card>
          <SectionHeader title="자격 & 다음 목표" />
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-ocean-900 text-xs font-extrabold text-white">{me.certAgency}</span>
              <div>
                <p className="text-sm font-bold text-gray-900">{me.certLevel}</p>
                <p className="text-xs text-gray-400">카드번호 ****-2041 · 2023.04 취득</p>
              </div>
              <Tag tone="green">인증됨</Tag>
            </div>
            {[
              { label: "100로그 달성", now: stats.totalDives, goal: 100 },
              { label: "레스큐 다이버 (추천 50로그+)", now: stats.totalDives, goal: 50 },
              { label: "해외 포인트 5곳", now: 1, goal: 5 },
            ].map((g) => (
              <div key={g.label}>
                <div className="flex justify-between text-xs"><span className="text-gray-700">{g.label}</span><span className="text-gray-400">{Math.min(g.now, g.goal)}/{g.goal}</span></div>
                <div className="mt-1 h-2 rounded-full bg-gray-100"><div className="h-full rounded-full bg-ocean-500" style={{ width: `${Math.min(100, (g.now / g.goal) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 로그 리스트 */}
      <section className="space-y-3">
        <h2 className="text-[15px] font-bold text-gray-900">다이빙 기록</h2>
        {logs.map((l) => (
          <article key={l.id} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4 sm:w-56">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-ocean-50 text-ocean-800">
                <span className="text-[10px]">DIVE</span>
                <span className="text-lg font-extrabold leading-none">{l.diveNo}</span>
              </div>
              <div className="min-w-0">
                <Link href={`/points/${l.pointId}`} className="block truncate font-bold text-gray-900 hover:text-ocean-700">{l.pointName}</Link>
                <p className="text-xs text-gray-400">{l.date.replaceAll("-", ".")} · {l.suit}</p>
                <span className="mt-0.5 flex text-amber-400">{Array.from({ length: l.rating }).map((_, i) => <Star key={i} size={11} fill="currentColor" />)}</span>
              </div>
            </div>
            <dl className="grid flex-1 grid-cols-4 gap-2 text-center">
              {[
                { icon: ArrowDownToLine, v: `${l.maxDepth}m`, k: "최대" },
                { icon: Timer, v: `${l.bottomTime}분`, k: "시간" },
                { icon: Thermometer, v: `${l.waterTemp}°`, k: "수온" },
                { icon: Eye, v: `${l.visibility}m`, k: "시야" },
              ].map((x) => (
                <div key={x.k} className="rounded-lg bg-gray-50 py-2">
                  <dt className="flex items-center justify-center gap-0.5 text-[10px] text-gray-400"><x.icon size={11} /> {x.k}</dt>
                  <dd className="text-sm font-bold text-gray-800">{x.v}</dd>
                </div>
              ))}
            </dl>
            <div className="text-xs text-gray-500 sm:w-48">
              {l.buddy && <p className="flex items-center gap-1"><Users size={12} /> 버디 {l.buddy}</p>}
              <p className="mt-0.5">공기 {l.tankStart}→{l.tankEnd}bar · 웨이트 {l.weight}kg</p>
              {l.sightings.length > 0 && <p className="mt-0.5 line-clamp-1 text-ocean-700">🐟 {l.sightings.join(", ")}</p>}
              {l.memo && <p className="mt-0.5 line-clamp-1 text-gray-400">“{l.memo}”</p>}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
