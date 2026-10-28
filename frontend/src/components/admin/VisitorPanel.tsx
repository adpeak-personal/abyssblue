import { Eye, MousePointerClick, TrendingUp, UserPlus } from "lucide-react";
import { formatNumber } from "@/lib/utils";

/**
 * 방문자 현황 — 아직 수집 기능이 없어서 전부 데모 수치다.
 * 실제 값처럼 보이면 안 되므로 패널 전체에 "데모 데이터" 표시를 붙인다.
 *
 * TODO: 방문 로그 테이블(또는 GA4 연동) 후 실제 지표로 교체.
 *       그때 이 파일의 DEMO_* 상수를 지우고 props 로 받게 바꾸면 된다.
 */
const DEMO_DAILY = [
  { label: "월", visitors: 312, views: 918 },
  { label: "화", visitors: 289, views: 842 },
  { label: "수", visitors: 341, views: 1004 },
  { label: "목", visitors: 375, views: 1132 },
  { label: "금", visitors: 428, views: 1310 },
  { label: "토", visitors: 516, views: 1688 },
  { label: "일", visitors: 472, views: 1497 },
];

const DEMO_TODAY = { visitors: 472, views: 1497, signups: 6, avgStay: "3분 12초" };

function MiniStat({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs text-gray-500">
        <Icon size={14} className="text-ocean-500" />
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-extrabold text-gray-900">{value}</p>
      {delta && (
        <p className="mt-0.5 flex items-center gap-0.5 text-xs text-emerald-600">
          <TrendingUp size={11} />
          {delta}
        </p>
      )}
    </div>
  );
}

export function VisitorPanel() {
  const maxViews = Math.max(...DEMO_DAILY.map((d) => d.views));

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="whitespace-nowrap text-sm font-bold text-gray-900">방문자 현황</h2>
        <span className="whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
          데모 데이터
        </span>
        <span className="text-xs text-gray-400">방문 수집 기능 붙이기 전까지 임시 화면입니다</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon={Eye} label="오늘 방문자" value={formatNumber(DEMO_TODAY.visitors)} delta="어제 대비 +9.8%" />
        <MiniStat icon={MousePointerClick} label="오늘 페이지뷰" value={formatNumber(DEMO_TODAY.views)} delta="어제 대비 +12.7%" />
        <MiniStat icon={UserPlus} label="오늘 가입" value={formatNumber(DEMO_TODAY.signups)} />
        <MiniStat icon={TrendingUp} label="평균 체류시간" value={DEMO_TODAY.avgStay} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">최근 7일 방문 추이</p>
          <p className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-ocean-400" /> 방문자
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-ocean-200" /> 페이지뷰
            </span>
          </p>
        </div>

        {/* items-end 를 주면 컬럼이 콘텐츠 높이로 줄어서 막대의 % 높이가 0이 된다 — 기본 stretch 유지 */}
        <div className="mt-5 flex h-40 gap-2">
          {DEMO_DAILY.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[11px] text-gray-500">{formatNumber(d.visitors)}</span>
              {/* 페이지뷰를 옅은 막대로 깔고 방문자를 그 위에 겹쳐 보여준다 */}
              <div className="relative flex w-full flex-1 items-end justify-center">
                <div
                  className="w-full rounded-t bg-ocean-100"
                  style={{ height: `${(d.views / maxViews) * 100}%` }}
                />
                <div
                  className="absolute bottom-0 w-1/2 rounded-t bg-ocean-400"
                  style={{ height: `${(d.visitors / maxViews) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-gray-400">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
