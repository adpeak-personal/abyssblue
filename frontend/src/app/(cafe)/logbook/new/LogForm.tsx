"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, X } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { DivePoint } from "@/types";

const inputCls = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-ocean-400";

const SUITS = ["3mm 웻슈트", "5mm 웻슈트", "7mm 반건식", "드라이슈트"];
const TANKS = ["알루미늄 11L", "스틸 12L", "나이트록스 32%"];
const CURRENTS = ["없음", "약함", "보통", "강함"] as const;
const WEATHERS = ["맑음", "흐림", "비"] as const;
const WAVES = ["잔잔", "약간", "높음"] as const;
const ENTRIES = ["보트", "비치"] as const;

/** 오늘 날짜 (로컬 기준) — new Date().toISOString() 은 UTC 라 한국에선 하루 어긋난다 */
function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
    </label>
  );
}

/** 숫자 입력 — 비어 있으면 빈 문자열을 유지한다 (0 이 멋대로 들어가지 않게) */
type NumField = number | "";

export function LogForm({ points, nextDiveNo }: { points: DivePoint[]; nextDiveNo: number }) {
  const router = useRouter();

  const [date, setDate] = useState(today());
  const [diveTime, setDiveTime] = useState("10:30");
  const [pointId, setPointId] = useState<number | "">(points[0]?.id ?? "");
  const [entryType, setEntryType] = useState<(typeof ENTRIES)[number]>("보트");
  const [buddy, setBuddy] = useState("");

  const [maxDepth, setMaxDepth] = useState<NumField>("");
  const [avgDepth, setAvgDepth] = useState<NumField>("");
  const [bottomTime, setBottomTime] = useState<NumField>("");
  const [waterTemp, setWaterTemp] = useState<NumField>("");
  const [visibility, setVisibility] = useState<NumField>("");
  const [current, setCurrent] = useState<(typeof CURRENTS)[number]>("없음");
  const [weather, setWeather] = useState<(typeof WEATHERS)[number]>("맑음");
  const [waves, setWaves] = useState<(typeof WAVES)[number]>("잔잔");

  const [suit, setSuit] = useState(SUITS[0]);
  const [weight, setWeight] = useState<NumField>(6);
  const [tank, setTank] = useState(TANKS[0]);
  const [tankStart, setTankStart] = useState<NumField>(200);
  const [tankEnd, setTankEnd] = useState<NumField>(60);

  const [rating, setRating] = useState(4);
  const [sightings, setSightings] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [memo, setMemo] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSighting = () => {
    const v = draft.trim();
    if (v && !sightings.includes(v)) setSightings([...sightings, v]);
    setDraft("");
  };

  const used =
    typeof tankStart === "number" && typeof tankEnd === "number" ? tankStart - tankEnd : null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 서버도 다시 검사하지만, 여기서 걸러야 왕복 없이 바로 알려줄 수 있다
    if (!pointId) return setError("포인트를 선택해 주세요.");
    const required = { maxDepth, avgDepth, bottomTime, waterTemp, visibility, weight, tankStart, tankEnd };
    if (Object.values(required).some((v) => v === "")) {
      return setError("수심 · 환경 · 장비 항목을 모두 입력해 주세요.");
    }
    if (Number(avgDepth) > Number(maxDepth)) {
      return setError("평균 수심은 최대 수심보다 클 수 없습니다.");
    }
    if (Number(tankEnd) > Number(tankStart)) {
      return setError("종료 압력은 시작 압력보다 클 수 없습니다.");
    }

    setSubmitting(true);
    try {
      await apiFetch("/logs", {
        method: "POST",
        body: JSON.stringify({
          date,
          diveTime,
          pointId: Number(pointId),
          entryType,
          buddy: buddy.trim() || undefined,
          maxDepth: Number(maxDepth),
          avgDepth: Number(avgDepth),
          bottomTime: Number(bottomTime),
          waterTemp: Number(waterTemp),
          visibility: Number(visibility),
          current,
          weather,
          waves,
          suit,
          weight: Number(weight),
          tank,
          tankStart: Number(tankStart),
          tankEnd: Number(tankEnd),
          sightings,
          memo,
          rating,
          isPublic,
        }),
      });
      router.replace("/logbook");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그를 저장하지 못했어요.");
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-900">기본 정보</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="다이브 번호" hint="저장할 때 자동으로 매겨져요">
            <input value={nextDiveNo} readOnly className={`${inputCls} bg-gray-50 text-gray-500`} />
          </Field>
          <Field label="날짜">
            <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="입수 시간">
            <input type="time" value={diveTime} onChange={(e) => setDiveTime(e.target.value)} className={inputCls} />
          </Field>
          <Field label="포인트">
            <select
              value={pointId}
              onChange={(e) => setPointId(Number(e.target.value))}
              className={inputCls}
            >
              {points.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.area})
                </option>
              ))}
            </select>
          </Field>
          <Field label="입수 방식">
            <select value={entryType} onChange={(e) => setEntryType(e.target.value as typeof entryType)} className={inputCls}>
              {ENTRIES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="버디">
            <input value={buddy} onChange={(e) => setBuddy(e.target.value)} placeholder="함께 들어간 사람" className={inputCls} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-900">수심 · 환경</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="최대 수심 (m)">
            <input type="number" step="0.1" value={maxDepth} onChange={(e) => setMaxDepth(e.target.value === "" ? "" : Number(e.target.value))} placeholder="18.5" className={inputCls} />
          </Field>
          <Field label="평균 수심 (m)">
            <input type="number" step="0.1" value={avgDepth} onChange={(e) => setAvgDepth(e.target.value === "" ? "" : Number(e.target.value))} placeholder="11.2" className={inputCls} />
          </Field>
          <Field label="다이빙 시간 (분)">
            <input type="number" value={bottomTime} onChange={(e) => setBottomTime(e.target.value === "" ? "" : Number(e.target.value))} placeholder="45" className={inputCls} />
          </Field>
          <Field label="수온 (°C)">
            <input type="number" step="0.1" value={waterTemp} onChange={(e) => setWaterTemp(e.target.value === "" ? "" : Number(e.target.value))} placeholder="21" className={inputCls} />
          </Field>
          <Field label="시야 (m)">
            <input type="number" step="0.1" value={visibility} onChange={(e) => setVisibility(e.target.value === "" ? "" : Number(e.target.value))} placeholder="15" className={inputCls} />
          </Field>
          <Field label="조류">
            <select value={current} onChange={(e) => setCurrent(e.target.value as typeof current)} className={inputCls}>
              {CURRENTS.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="날씨">
            <select value={weather} onChange={(e) => setWeather(e.target.value as typeof weather)} className={inputCls}>
              {WEATHERS.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="파도">
            <select value={waves} onChange={(e) => setWaves(e.target.value as typeof waves)} className={inputCls}>
              {WAVES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-900">장비 · 공기</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="슈트">
            <select value={suit} onChange={(e) => setSuit(e.target.value)} className={inputCls}>
              {SUITS.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="웨이트 (kg)">
            <input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="탱크">
            <select value={tank} onChange={(e) => setTank(e.target.value)} className={inputCls}>
              {TANKS.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="공기 사용량" hint={used === null ? undefined : `${used} bar 사용`}>
            <div className="flex items-center gap-1">
              <input type="number" value={tankStart} onChange={(e) => setTankStart(e.target.value === "" ? "" : Number(e.target.value))} className={inputCls} />
              <span className="text-gray-400">→</span>
              <input type="number" value={tankEnd} onChange={(e) => setTankEnd(e.target.value === "" ? "" : Number(e.target.value))} className={inputCls} />
            </div>
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-900">본 생물 · 메모</h2>
        <div className="flex flex-wrap gap-1.5">
          {sightings.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-ocean-50 px-2.5 py-1 text-xs text-ocean-700">
              🐟 {s}
              <button type="button" onClick={() => setSightings(sightings.filter((x) => x !== s))} aria-label={`${s} 삭제`}><X size={12} /></button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSighting())}
            placeholder="생물 이름 입력 후 Enter"
            className={inputCls}
          />
          <button type="button" onClick={addSighting} className="shrink-0 rounded-lg border border-gray-200 px-3 text-sm">추가</button>
        </div>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={4} placeholder="오늘 다이빙은 어땠나요?" className={`${inputCls} mt-4`} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-gray-600">만족도</span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n}점`} className="p-0.5 text-amber-400">
                <Star size={22} fill={n <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-ocean-600" />
            커뮤니티에 공개
          </label>
        </div>
        <p className="mt-1 text-right text-[11px] text-gray-400">
          공개하면 이 포인트 상세의 &lsquo;최근 회원 로그&rsquo;에 표시돼요.
        </p>
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-coral-500">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg bg-ocean-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ocean-700 disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          로그 저장
        </button>
      </div>
    </form>
  );
}
