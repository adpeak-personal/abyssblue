import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Star, ArrowDownToLine, Eye, CalendarRange, Anchor, Store, Fish } from "lucide-react";
import { diveLogs, posts } from "@/data/mock";
import { getPoint, getUser } from "@/lib/data";
import { Avatar, Card, SectionHeader, Tag, Thumb } from "@/components/ui";
import { formatRelative } from "@/lib/utils";

export default async function PointDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = getPoint(Number(id));
  if (!p) notFound();

  const maxTemp = Math.max(...p.waterTemp.map((w) => w.temp));
  const minTemp = Math.min(...p.waterTemp.map((w) => w.temp));
  const logs = diveLogs.filter((l) => l.pointId === p.id);
  const relatedPosts = posts.filter((post) => post.title.includes(p.name.split(" ")[0]) || post.content.includes(p.name.split(" ")[0])).slice(0, 4);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="relative">
          <Thumb gradient={p.gradient} className="h-56 sm:h-72" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-5 text-white sm:p-7">
            <div className="flex gap-1.5">
              <Tag tone="dark">{p.region}</Tag>
              <Tag tone={p.difficulty === "상급" ? "coral" : p.difficulty === "중급" ? "ocean" : "green"}>{p.difficulty}</Tag>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{p.name}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm opacity-90"><MapPin size={14} /> {p.country} · {p.area}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-gray-100 border-t border-gray-100 sm:grid-cols-4 sm:divide-x">
          {[
            { icon: ArrowDownToLine, label: "수심", value: `${p.depthMin}~${p.depthMax}m` },
            { icon: Eye, label: "시야", value: p.visibility },
            { icon: CalendarRange, label: "베스트 시즌", value: p.bestSeason },
            { icon: Anchor, label: "입수", value: p.entryType.join(" · ") },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 px-5 py-4">
              <s.icon size={20} className="text-ocean-500" />
              <div>
                <p className="text-[11px] text-gray-400">{s.label}</p>
                <p className="text-sm font-bold text-gray-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-bold text-gray-900">포인트 소개</h2>
            <p className="mt-2 text-[15px] leading-7 text-gray-700">{p.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.marineLife.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 rounded-full bg-ocean-50 px-2.5 py-1 text-xs text-ocean-700"><Fish size={12} /> {m}</span>
              ))}
            </div>
          </Card>

          {/* 월별 수온 차트 */}
          <Card>
            <SectionHeader title="🌡 월별 평균 수온" sub={`${minTemp}°C ~ ${maxTemp}°C`} />
            <div className="overflow-x-auto px-5 pb-4 pt-6">
              <div className="flex h-44 min-w-[480px] items-end gap-2">
                {p.waterTemp.map((w) => {
                  const h = 20 + ((w.temp - minTemp) / Math.max(1, maxTemp - minTemp)) * 80;
                  const current = w.month === 9;
                  return (
                    <div key={w.month} className="flex flex-1 flex-col items-center gap-1">
                      <span className={`text-[11px] ${current ? "font-bold text-coral-500" : "text-gray-500"}`}>{w.temp}°</span>
                      <div className={`w-full rounded-t ${current ? "bg-coral-400" : w.temp >= 20 ? "bg-ocean-400" : "bg-ocean-200"}`} style={{ height: `${h}%` }} />
                      <span className={`text-[11px] ${current ? "font-bold text-gray-900" : "text-gray-400"}`}>{w.month}월</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-gray-400">추천 슈트 · 20°C 이상 3~5mm 웻슈트 / 15~20°C 7mm 또는 반건식 / 15°C 미만 드라이슈트</p>
            </div>
          </Card>

          <Card>
            <SectionHeader title={<>⭐ 다이버 리뷰 <span className="text-amber-500">{p.rating}</span></>} sub={`${p.reviewCount}개`} />
            <ul className="divide-y divide-gray-100">
              {[
                { uid: 3, rating: 5, text: "조류 없는 날 들어가면 천국입니다. 사진 찍기에도 좋아요." },
                { uid: 8, rating: 4, text: "샵 픽업 서비스 좋았고, 포인트 브리핑이 꼼꼼했어요." },
                { uid: 5, rating: 5, text: "초보인데 가이드가 잘 챙겨줘서 무섭지 않았어요!" },
              ].map((r, i) => {
                const u = getUser(r.uid);
                return (
                  <li key={i} className="flex gap-3 px-5 py-4">
                    <Avatar user={u} size={32} />
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        {u.nickname}
                        <span className="flex text-amber-400">{Array.from({ length: r.rating }).map((_, k) => <Star key={k} size={12} fill="currentColor" />)}</span>
                      </p>
                      <p className="mt-1 text-sm text-gray-700">{r.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <Link href="/logbook/new" className="block rounded-lg bg-ocean-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-ocean-700">이 포인트에서 로그 기록</Link>
            <button className="mt-2 w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">★ 가고 싶은 포인트에 저장</button>
          </Card>

          <Card>
            <SectionHeader title={<><Store size={15} /> 근처 다이빙샵</>} />
            <ul className="divide-y divide-gray-100 text-sm">
              {p.shops.map((s) => (
                <li key={s} className="flex items-center justify-between px-5 py-3">
                  <span className="text-gray-800">{s}</span>
                  <Tag tone="ocean">제휴</Tag>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionHeader title="📘 최근 회원 로그" />
            <ul className="divide-y divide-gray-100">
              {logs.length === 0 && <li className="px-5 py-6 text-center text-xs text-gray-400">아직 기록이 없어요</li>}
              {logs.map((l) => (
                <li key={l.id} className="px-5 py-3 text-xs">
                  <p className="font-semibold text-gray-800">{getUser(l.userId).nickname} · {l.date.slice(5).replace("-", ".")}</p>
                  <p className="mt-0.5 text-gray-500">최대 {l.maxDepth}m · {l.bottomTime}분 · 수온 {l.waterTemp}° · 시야 {l.visibility}m</p>
                </li>
              ))}
            </ul>
          </Card>

          {relatedPosts.length > 0 && (
            <Card>
              <SectionHeader title="💬 관련 게시글" />
              <ul className="py-1">
                {relatedPosts.map((post) => (
                  <li key={post.id}>
                    <Link href={`/board/${post.boardSlug}/${post.id}`} className="block px-5 py-2 text-sm hover:bg-gray-50">
                      <span className="line-clamp-1 text-gray-700">{post.title}</span>
                      <span className="text-xs text-gray-400">{formatRelative(post.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
