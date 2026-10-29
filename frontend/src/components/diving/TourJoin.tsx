"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import type { Tour } from "@/types";

export type MyStatus = "신청" | "확정" | "대기" | "취소" | null;

/** 상태마다 버튼이 하는 일이 다르다 — 한곳에 모아 둔다 */
const LABEL: Record<Exclude<MyStatus, null | "취소">, { text: string; hint: string }> = {
  확정: { text: "참여 확정", hint: "자리가 잡혔어요. 못 가게 되면 미리 취소해 주세요." },
  신청: { text: "승인 대기 중", hint: "주최자가 확인하면 확정됩니다." },
  대기: { text: "대기 중", hint: "정원이 찼어요. 앞사람이 취소하면 자동으로 확정됩니다." },
};

export function TourJoin({
  tourId,
  myStatus,
  tourStatus,
  joinMode,
  isHost,
  loggedIn,
}: {
  tourId: number;
  myStatus: MyStatus;
  tourStatus: Tour["status"];
  joinMode: Tour["joinMode"];
  isHost: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isHost) {
    return (
      <p className="rounded-xl bg-ocean-50 px-4 py-3 text-sm text-ocean-800">
        내가 연 투어입니다. 아래에서 신청자를 확인하세요.
      </p>
    );
  }

  if (!loggedIn) {
    return (
      <a
        href={`/login?next=/tours/${tourId}`}
        className="block rounded-xl bg-ocean-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-ocean-700"
      >
        로그인하고 신청하기
      </a>
    );
  }

  const joined = myStatus && myStatus !== "취소";

  const run = async (method: "POST" | "DELETE") => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch<unknown>(`/tours/${tourId}/join`, { method });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (joined) {
    const info = LABEL[myStatus as Exclude<MyStatus, null | "취소">];
    return (
      <div className="space-y-2">
        <div className="rounded-xl border border-ocean-200 bg-ocean-50 px-4 py-3">
          <p className="text-sm font-bold text-ocean-800">{info.text}</p>
          <p className="mt-0.5 text-xs text-ocean-700">{info.hint}</p>
        </div>
        <button
          type="button"
          onClick={() => void run("DELETE")}
          disabled={busy}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy ? "처리 중…" : "신청 취소"}
        </button>
        {error && <p className="text-xs text-coral-600">{error}</p>}
      </div>
    );
  }

  const closed = tourStatus === "마감";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void run("POST")}
        disabled={busy || closed}
        className="w-full rounded-xl bg-ocean-600 px-4 py-3 text-sm font-semibold text-white hover:bg-ocean-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {busy ? "처리 중…" : closed ? "마감된 투어예요" : "참여 신청하기"}
      </button>
      {!closed && (
        <p className="text-center text-xs text-gray-500">
          {joinMode === "승인제"
            ? "주최자가 확인한 뒤 확정됩니다."
            : "선착순이에요. 자리가 차면 대기로 들어갑니다."}
        </p>
      )}
      {error && <p className="text-xs text-coral-600">{error}</p>}
    </div>
  );
}
