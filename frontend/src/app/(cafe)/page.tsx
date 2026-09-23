import Link from "next/link";
import { Flame, Megaphone, Waves, Wind, Thermometer, BookOpen, MapPinned, Users } from "lucide-react";
import { CAFE_INFO, popularTags, posts, seaConditions } from "@/data/mock";
import { getCurrentUser, getLogStats, getNotices, getPoints, getPopularPosts, getPosts, getTours, getUser } from "@/lib/data";
import { Card, SectionHeader, Tag, Thumb } from "@/components/ui";
import { GalleryGrid } from "@/components/board/GalleryGrid";
import { PointCard } from "@/components/diving/PointCard";
import { TourCard } from "@/components/diving/TourCard";
import { formatNumber, formatRelative } from "@/lib/utils";

const STATUS_COLOR = { 좋음: "text-emerald-600 bg-emerald-50", 보통: "text-ocean-700 bg-ocean-50", 주의: "text-amber-600 bg-amber-50", 나쁨: "text-red-600 bg-red-50" };

export default function HomePage() {
  const me = getCurrentUser();
  const stats = getLogStats(me.id);
  const notices = getNotices();
  const popular = getPopularPosts(8);
  const gallery = posts.filter((p) => p.boardSlug === "photo").slice(0, 4);
  const latestBoards = [
    { slug: "free", name: "자유게시판" },
    { slug: "review", name: "다이빙 후기" },
    { slug: "qna", name: "초보 Q&A" },
    { slug: "gear", name: "장비 리뷰" },
  ];

  return (
    <div className="space-y-5">
      {/* 히어로 배너 */}
      <section className="grad-deep relative overflow-hidden rounded-2xl px-6 py-8 text-white sm:px-10 sm:py-10">
        <svg className="absolute inset-x-0 bottom-0 w-full opacity-20" viewBox="0 0 800 120" preserveAspectRatio="none" aria-hidden>
          <path d="M0 60 Q100 20 200 60 T400 60 T600 60 T800 60 V120 H0Z" fill="white" />
          <path d="M0 85 Q100 55 200 85 T400 85 T600 85 T800 85 V120 H0Z" fill="white" />
        </svg>
        <div className="relative">
          <Tag tone="coral">🎉 9월 이벤트</Tag>
          <h1 className="mt-3 text-2xl font-extrabold leading-snug sm:text-3xl">
            가을 수중사진 콘테스트<br />지금 참여하세요
          </h1>
          <p className="mt-2 text-sm text-ocean-100">1등 상품 수중카메라 하우징 · #가을콘테스트 태그로 갤러리에 업로드</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/board/photo" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ocean-800 hover:bg-ocean-50">사진 올리기</Link>
            <Link href="/board/notice/2" className="rounded-full border border-white/40 px-4 py-2 text-sm font-medium hover:bg-white/10">자세히 보기</Link>
          </div>
        </div>
      </section>

      {/* 빠른 메뉴 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/points", icon: MapPinned, label: "포인트 찾기", sub: `${getPoints().length}곳 등록` },
          { href: "/logbook", icon: BookOpen, label: "내 로그북", sub: `${stats.totalDives}로그` },
          { href: "/tours", icon: Users, label: "투어 · 번개", sub: `${getTours().filter((t) => t.status !== "마감").length}건 모집중` },
          { href: "/board/buddy", icon: Waves, label: "버디 구하기", sub: "오늘 새 글 1" },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 hover:border-ocean-300 hover:shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ocean-50 text-ocean-600"><q.icon size={20} /></span>
            <span>
              <span className="block text-sm font-bold text-gray-900">{q.label}</span>
              <span className="block text-xs text-gray-400">{q.sub}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* 공지 */}
      <Card>
        <ul className="divide-y divide-gray-100">
          {notices.map((n) => (
            <li key={n.id}>
              <Link href={`/board/notice/${n.id}`} className="flex items-center gap-2 px-5 py-2.5 text-sm hover:bg-gray-50">
                <Megaphone size={15} className="shrink-0 text-ocean-600" />
                <Tag tone="ocean">{n.category}</Tag>
                <span className="line-clamp-1 text-gray-800">{n.title}</span>
                <span className="ml-auto shrink-0 text-xs text-gray-400">{formatRelative(n.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          {/* 인기글 */}
          <Card>
            <SectionHeader title={<><Flame size={17} className="text-coral-500" /> 실시간 인기글</>} sub="조회 · 좋아요 기준" href="/board/all" />
            <ol className="grid sm:grid-cols-2">
              {popular.map((p, i) => (
                <li key={p.id} className="border-b border-gray-100 sm:odd:border-r">
                  <Link href={`/board/${p.boardSlug}/${p.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50">
                    <span className={`w-4 text-center text-sm font-extrabold ${i < 3 ? "text-coral-500" : "text-gray-400"}`}>{i + 1}</span>
                    <span className="line-clamp-1 flex-1 text-sm text-gray-800">{p.title}</span>
                    <span className="shrink-0 text-xs font-bold text-coral-500">[{p.commentCount}]</span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>

          {/* 게시판 최신글 */}
          <div className="grid gap-5 md:grid-cols-2">
            {latestBoards.map((b) => (
              <Card key={b.slug}>
                <SectionHeader title={b.name} href={`/board/${b.slug}`} />
                <ul className="py-1.5">
                  {getPosts({ boardSlug: b.slug, size: 5 }).items.map((p) => (
                    <li key={p.id}>
                      <Link href={`/board/${b.slug}/${p.id}`} className="flex items-center gap-2 px-5 py-1.5 text-sm hover:bg-gray-50">
                        {p.category && <span className="shrink-0 text-xs text-ocean-600">[{p.category}]</span>}
                        <span className="line-clamp-1 text-gray-700">{p.title}</span>
                        {p.commentCount > 0 && <span className="shrink-0 text-xs text-coral-500">[{p.commentCount}]</span>}
                        <span className="ml-auto shrink-0 text-xs text-gray-400">{formatRelative(p.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          {/* 사진 갤러리 */}
          <Card>
            <SectionHeader title="📷 수중사진 갤러리" href="/board/photo" />
            <div className="p-5">
              <GalleryGrid items={gallery} cols="grid-cols-2 sm:grid-cols-4" />
            </div>
          </Card>

          {/* 추천 포인트 */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-gray-900">🧭 이번 달 추천 포인트</h2>
              <Link href="/points" className="text-xs text-gray-400 hover:text-ocean-600">전체보기</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {getPoints().slice(0, 3).map((p) => <PointCard key={p.id} point={p} />)}
            </div>
          </section>
        </div>

        {/* 우측 위젯 */}
        <div className="space-y-5">
          <Card>
            <SectionHeader title="🌊 오늘의 바다" sub="09.15 12시" />
            <ul className="divide-y divide-gray-100">
              {seaConditions.map((s) => (
                <li key={s.area} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">{s.area}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${STATUS_COLOR[s.status]}`}>{s.status}</span>
                  </div>
                  <div className="mt-1 flex gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-0.5"><Waves size={12} /> {s.waveHeight}m</span>
                    <span className="flex items-center gap-0.5"><Thermometer size={12} /> {s.waterTemp}°C</span>
                    <span className="flex items-center gap-0.5"><Wind size={12} /> {s.wind}m/s</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="px-5 pb-3 text-[11px] text-gray-400">* 더미 데이터 · 추후 기상청 해양 API 연동</p>
          </Card>

          <Card>
            <SectionHeader title="🤿 모집중인 투어" href="/tours" />
            <div className="space-y-3 p-4">
              {getTours().filter((t) => t.status !== "마감").slice(0, 3).map((t) => <TourCard key={t.id} tour={t} compact />)}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[15px] font-bold text-gray-900">📘 {me.nickname}님의 로그</p>
            <dl className="mt-3 grid grid-cols-3 text-center">
              <div><dt className="text-[11px] text-gray-400">총 다이빙</dt><dd className="text-lg font-extrabold text-ocean-700">{stats.totalDives}</dd></div>
              <div><dt className="text-[11px] text-gray-400">최대수심</dt><dd className="text-lg font-extrabold text-ocean-700">{stats.maxDepth}m</dd></div>
              <div><dt className="text-[11px] text-gray-400">포인트</dt><dd className="text-lg font-extrabold text-ocean-700">{stats.pointsVisited}</dd></div>
            </dl>
            <Link href="/logbook/new" className="mt-4 block rounded-lg border border-ocean-600 py-2 text-center text-sm font-semibold text-ocean-700 hover:bg-ocean-50">+ 새 로그 기록</Link>
          </Card>

          <Card className="p-5">
            <p className="text-[15px] font-bold text-gray-900">🏷 인기 태그</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {popularTags.map((t) => (
                <Link key={t} href={`/search?q=${encodeURIComponent(t.slice(1))}`} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-ocean-50 hover:text-ocean-700">{t}</Link>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <Thumb gradient="sunset" className="h-24" />
            <div className="p-4">
              <p className="text-sm font-bold text-gray-900">🙌 새로 가입한 다이버</p>
              <p className="mt-1 text-xs text-gray-500">{getUser(5).nickname}님 외 오늘 {formatNumber(42)}명이 가입했어요</p>
              <Link href="/board/greeting" className="mt-2 inline-block text-xs font-semibold text-ocean-600">환영 인사 남기기 →</Link>
            </div>
          </Card>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">{CAFE_INFO.name} 회원 {formatNumber(CAFE_INFO.memberCount)}명과 함께하는 중</p>
    </div>
  );
}
