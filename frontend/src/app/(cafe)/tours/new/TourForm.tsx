"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import type { Tour } from "@/types";

const TYPES: Tour["type"][] = ["번개", "정기투어", "해외투어", "교육"];
const REGIONS: Tour["region"][] = ["동해", "남해", "제주", "서해", "해외"];

/** 오늘(KST) — 지난 날짜로 모집하는 걸 막는다 */
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

const label = "mb-1 block text-xs font-bold text-gray-600";
const field =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-500";

export function TourForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    type: "번개" as Tour["type"],
    pointName: "",
    region: "동해" as Tour["region"],
    startDate: today(),
    endDate: today(),
    capacity: 6,
    price: 0,
    minCert: "",
    joinMode: "선착순" as Tour["joinMode"],
    description: "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 끝나는 날이 시작일보다 빠르면 백엔드가 막지만, 먼저 알려주는 편이 낫다
    if (form.endDate < form.startDate) {
      setError("끝나는 날이 시작일보다 빠릅니다.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const tour = await apiFetch<Tour>("/tours", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.replace(`/tours/${tour.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "투어를 열지 못했어요.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <div>
        <label className={label} htmlFor="title">제목</label>
        <input
          id="title" required minLength={2} maxLength={200} className={field}
          placeholder="예) 이번 주 토요일 양양 기사문 번개"
          value={form.title} onChange={(e) => set("title", e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="type">종류</label>
          <select id="type" className={field} value={form.type}
            onChange={(e) => set("type", e.target.value as Tour["type"])}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="region">지역</label>
          <select id="region" className={field} value={form.region}
            onChange={(e) => set("region", e.target.value as Tour["region"])}>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="point">포인트 · 장소</label>
        <input id="point" required maxLength={100} className={field}
          placeholder="예) 양양 기사문"
          value={form.pointName} onChange={(e) => set("pointName", e.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="start">시작일</label>
          <input id="start" type="date" required min={today()} className={field}
            value={form.startDate}
            onChange={(e) => {
              set("startDate", e.target.value);
              // 하루짜리가 대부분이라 끝나는 날을 같이 당겨 준다
              if (form.endDate < e.target.value) set("endDate", e.target.value);
            }} />
        </div>
        <div>
          <label className={label} htmlFor="end">끝나는 날</label>
          <input id="end" type="date" required min={form.startDate} className={field}
            value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="capacity">정원 (명)</label>
          <input id="capacity" type="number" required min={1} max={500} className={field}
            value={form.capacity}
            onChange={(e) => set("capacity", Number(e.target.value))} />
        </div>
        <div>
          <label className={label} htmlFor="price">참가비 (원)</label>
          <input id="price" type="number" required min={0} step={1000} className={field}
            value={form.price} onChange={(e) => set("price", Number(e.target.value))} />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="cert">최소 자격 <span className="font-normal text-gray-400">(비워두면 제한 없음)</span></label>
        <input id="cert" maxLength={100} className={field}
          placeholder="예) Advanced Open Water"
          value={form.minCert} onChange={(e) => set("minCert", e.target.value)} />
      </div>

      <fieldset>
        <legend className={label}>신청 방식</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            { v: "선착순", t: "선착순", d: "신청 즉시 확정. 정원이 차면 대기로 들어갑니다." },
            { v: "승인제", t: "승인제", d: "신청을 받고 내가 확인한 뒤 확정합니다." },
          ] as const).map((o) => (
            <label key={o.v}
              className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm ${
                form.joinMode === o.v ? "border-ocean-500 bg-ocean-50" : "border-gray-200"
              }`}>
              <input type="radio" name="joinMode" className="sr-only"
                checked={form.joinMode === o.v}
                onChange={() => set("joinMode", o.v)} />
              <span className="font-bold text-gray-900">{o.t}</span>
              <span className="mt-0.5 block text-xs text-gray-500">{o.d}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className={label} htmlFor="desc">안내</label>
        <textarea id="desc" required rows={7} maxLength={5000} className={field}
          placeholder="집합 장소와 시간, 준비물, 이동 방법, 포함되는 비용 등을 적어주세요."
          value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>

      {error && <p className="text-sm text-coral-600">{error}</p>}

      <button type="submit" disabled={busy}
        className="w-full rounded-xl bg-ocean-600 px-4 py-3 text-sm font-semibold text-white hover:bg-ocean-700 disabled:bg-gray-300">
        {busy ? "여는 중…" : "투어 열기"}
      </button>
    </form>
  );
}
