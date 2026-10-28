"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Siren } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { REPORT_REASONS, type ReportReason } from "@/types/member";

/**
 * 신고 버튼 + 사유 선택.
 *
 * 글·댓글·회원을 같은 컴포넌트로 받는다. 자기 것이면 서버가 400 으로 막는데,
 * 굳이 눌러 보게 할 이유가 없어 보여줄지 말지는 부르는 쪽이 정한다.
 */
export function ReportButton({
  targetType,
  targetId,
  loggedIn,
  className,
}: {
  targetType: "post" | "comment" | "user";
  targetId: number;
  loggedIn: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0]);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/reports", {
        method: "POST",
        body: JSON.stringify({ targetType, targetId, reason, detail: detail.trim() || undefined }),
      });
      setDone(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "신고하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <span className={`flex items-center gap-1 text-xs text-emerald-600 ${className ?? ""}`}>
        <Check size={13} /> 신고했습니다
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!loggedIn) {
            router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
            return;
          }
          setOpen((v) => !v);
          setError(null);
        }}
        className={`flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 ${className ?? ""}`}
      >
        <Siren size={13} /> 신고
      </button>

      {open && (
        <div className="absolute bottom-7 right-0 z-10 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-bold text-gray-900">신고 사유</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  reason === r
                    ? "bg-coral-500 font-semibold text-white"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="자세한 내용 (선택)"
            className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-ocean-400"
          />

          {error && (
            <p role="alert" className="mt-1 text-xs text-coral-500">
              {error}
            </p>
          )}

          <p className="mt-1 text-[11px] text-gray-400">
            같은 대상은 한 번만 신고할 수 있어요.
          </p>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="flex items-center gap-1 rounded-md bg-coral-500 px-3 py-1 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-60"
            >
              {busy && <Loader2 size={12} className="animate-spin" />}
              신고하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
