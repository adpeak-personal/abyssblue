import Link from "next/link";
import { Settings, Award, MapPin, CalendarDays } from "lucide-react";
import { posts, comments } from "@/data/mock";
import { getCurrentUser, getLogStats } from "@/lib/data";
import { Avatar, Card, LevelBadge, SectionHeader, Thumb } from "@/components/ui";
import { PostTable } from "@/components/board/PostTable";

export const metadata = { title: "마이페이지" };

export default function MyPage() {
  const me = getCurrentUser();
  const stats = getLogStats(me.id);
  const myPosts = posts.filter((p) => p.authorId === me.id);
  const myComments = comments.filter((c) => c.authorId === me.id);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <Thumb gradient="lagoon" className="h-28" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end gap-4">
            <div className="rounded-full border-4 border-white"><Avatar user={me} size={80} /></div>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">{me.nickname} <LevelBadge level={me.level} /></h1>
              <p className="mt-0.5 flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Award size={12} /> {me.certAgency} {me.certLevel}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {me.region}</span>
                <span className="flex items-center gap-1"><CalendarDays size={12} /> {me.joinedAt.replaceAll("-", ".")} 가입</span>
              </p>
            </div>
            <button className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"><Settings size={15} /> 프로필 수정</button>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[
              { k: "다이빙", v: `${stats.totalDives}회` },
              { k: "작성글", v: myPosts.length },
              { k: "댓글", v: myComments.length },
              { k: "받은 좋아요", v: myPosts.reduce((s, p) => s + p.likes, 0) },
            ].map((x) => (
              <div key={x.k} className="rounded-lg bg-gray-50 py-3">
                <dt className="text-xs text-gray-400">{x.k}</dt>
                <dd className="text-lg font-extrabold text-gray-900">{x.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <Card>
        <SectionHeader title="🏅 등급 안내" sub="활동에 따라 자동 승급" />
        <ol className="grid grid-cols-2 gap-px bg-gray-100 text-center text-xs sm:grid-cols-5">
          {[
            { l: "새싹", c: "가입 즉시" },
            { l: "물방울", c: "글 5 · 댓글 20" },
            { l: "파도", c: "글 20 · 방문 30일" },
            { l: "산호", c: "글 50 · 로그 100" },
            { l: "고래", c: "글 150 · 로그 500" },
          ].map((g) => (
            <li key={g.l} className={`bg-white px-3 py-4 ${g.l === me.level ? "ring-2 ring-inset ring-ocean-500" : ""}`}>
              <LevelBadge level={g.l as typeof me.level} />
              <p className="mt-1.5 text-gray-500">{g.c}</p>
            </li>
          ))}
        </ol>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-gray-900">내가 쓴 글</h2>
          <Link href="/logbook" className="text-xs text-ocean-600">로그북 보기 →</Link>
        </div>
        <PostTable items={myPosts} showBoard />
      </section>
    </div>
  );
}
