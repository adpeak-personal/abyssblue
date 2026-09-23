"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import { divePoints } from "@/data/mock";

const inputCls = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-ocean-400";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
    </label>
  );
}

export function LogForm() {
  const [rating, setRating] = useState(4);
  const [sightings, setSightings] = useState<string[]>(["자리돔"]);
  const [draft, setDraft] = useState("");
  const [tankStart, setTankStart] = useState(200);
  const [tankEnd, setTankEnd] = useState(60);

  const addSighting = () => {
    const v = draft.trim();
    if (v && !sightings.includes(v)) setSightings([...sightings, v]);
    setDraft("");
  };

  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-900">기본 정보</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="다이브 번호"><input type="number" defaultValue={88} className={inputCls} /></Field>
          <Field label="날짜"><input type="date" defaultValue="2026-09-15" className={inputCls} /></Field>
          <Field label="입수 시간"><input type="time" defaultValue="10:30" className={inputCls} /></Field>
          <Field label="포인트">
            <select className={inputCls}>
              {divePoints.map((p) => <option key={p.id}>{p.name} ({p.area})</option>)}
              <option>직접 입력…</option>
            </select>
          </Field>
          <Field label="입수 방식">
            <select className={inputCls}><option>보트</option><option>비치</option></select>
          </Field>
          <Field label="버디"><input placeholder="닉네임 검색" className={inputCls} /></Field>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-900">수심 · 환경</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="최대 수심 (m)"><input type="number" step="0.1" placeholder="18.5" className={inputCls} /></Field>
          <Field label="평균 수심 (m)"><input type="number" step="0.1" placeholder="11.2" className={inputCls} /></Field>
          <Field label="다이빙 시간 (분)"><input type="number" placeholder="45" className={inputCls} /></Field>
          <Field label="수온 (°C)"><input type="number" placeholder="21" className={inputCls} /></Field>
          <Field label="시야 (m)"><input type="number" placeholder="15" className={inputCls} /></Field>
          <Field label="조류">
            <select className={inputCls}><option>없음</option><option>약함</option><option>보통</option><option>강함</option></select>
          </Field>
          <Field label="날씨">
            <select className={inputCls}><option>맑음</option><option>흐림</option><option>비</option></select>
          </Field>
          <Field label="파도">
            <select className={inputCls}><option>잔잔</option><option>약간</option><option>높음</option></select>
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-900">장비 · 공기</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="슈트">
            <select className={inputCls}><option>3mm 웻슈트</option><option>5mm 웻슈트</option><option>7mm 반건식</option><option>드라이슈트</option></select>
          </Field>
          <Field label="웨이트 (kg)"><input type="number" defaultValue={6} className={inputCls} /></Field>
          <Field label="탱크">
            <select className={inputCls}><option>알루미늄 11L</option><option>스틸 12L</option><option>나이트록스 32%</option></select>
          </Field>
          <Field label="공기 사용량" hint={`${tankStart - tankEnd} bar 사용`}>
            <div className="flex items-center gap-1">
              <input type="number" value={tankStart} onChange={(e) => setTankStart(Number(e.target.value))} className={inputCls} />
              <span className="text-gray-400">→</span>
              <input type="number" value={tankEnd} onChange={(e) => setTankEnd(Number(e.target.value))} className={inputCls} />
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
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSighting())} placeholder="생물 이름 입력 후 Enter" className={inputCls} />
          <button type="button" onClick={addSighting} className="shrink-0 rounded-lg border border-gray-200 px-3 text-sm">추가</button>
        </div>
        <textarea rows={4} placeholder="오늘 다이빙은 어땠나요?" className={`${inputCls} mt-4`} />
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-600">만족도</span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n}점`} className="p-0.5 text-amber-400">
                <Star size={22} fill={n <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" defaultChecked className="accent-ocean-600" /> 커뮤니티에 공개
          </label>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <button type="button" className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-600">취소</button>
        <button className="rounded-lg bg-ocean-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ocean-700">로그 저장</button>
      </div>
    </form>
  );
}
