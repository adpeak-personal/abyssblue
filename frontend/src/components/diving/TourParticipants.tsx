"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { UserChip } from "@/components/ui";
import type { PostAuthor, Tour } from "@/types";

export interface TourParticipant {
  userId: number;
  status: "신청" | "확정" | "대기" | "취소";
  joinedAt: string;
  user: PostAuthor | null;
}

/** 확정 → 신청 → 대기 순으로 보여준다. 주최자가 가장 먼저 볼 것이 확정 명단이다 */
const GROUPS = [
  { status: "확정", title: "확정", tone: "text-ocean-700" },
  { status: "신청", title: "신청 (승인 대기)", tone: "text-amber-700" },
  { status: "대기", title: "대기", tone: "text-gray-500" },
] as const;

export function TourParticipants({
  tourId,
  participants,
  canManage,
  joinMode,
}: {
  tourId: number;
  participants: TourParticipant[];
  canManage: boolean;
  joinMode: Tour["joinMode"];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = async (userId: number, status: "확정" | "취소") => {
    if (status === "취소" && !confirm("이 사람을 명단에서 빼시겠어요?")) return;
    setBusy(userId);
    setError(null);
    try {
      await apiFetch(`/tours/${tourId}/participants/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  if (participants.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">아직 신청한 사람이 없어요.</p>;
  }

  return (
    <div className="space-y-5">
      {error && <p className="text-xs text-coral-600">{error}</p>}

      {GROUPS.map((g) => {
        const rows = participants.filter((p) => p.status === g.status);
        if (rows.length === 0) return null;
        return (
          <div key={g.status}>
            <h3 className={`mb-2 text-xs font-bold ${g.tone}`}>
              {g.title} {rows.length}명
            </h3>
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {rows.map((p) => (
                <li key={p.userId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <UserChip user={p.user} />
                  {canManage && (
                    <div className="flex shrink-0 gap-1.5">
                      {p.status !== "확정" && (
                        <button
                          type="button"
                          onClick={() => void set(p.userId, "확정")}
                          disabled={busy === p.userId}
                          className="rounded-lg bg-ocean-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-ocean-700 disabled:opacity-50"
                        >
                          확정
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void set(p.userId, "취소")}
                        disabled={busy === p.userId}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        빼기
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {canManage && joinMode === "선착순" && (
        <p className="text-xs text-gray-500">
          선착순 투어예요. 확정자가 빠지면 대기 1번이 자동으로 올라갑니다.
        </p>
      )}
    </div>
  );
}
