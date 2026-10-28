"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { Tag } from "@/components/ui";
import { formatRelative } from "@/lib/utils";
import type { Report, ReportStatus } from "@/types/member";

const TARGET_LABEL = { post: "게시글", comment: "댓글", user: "회원" } as const;
const STATUS_TONE: Record<ReportStatus, "coral" | "green" | "gray"> = {
  접수: "coral",
  처리완료: "green",
  반려: "gray",
};

export function ReportList({ reports }: { reports: Report[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState<Record<number, string>>({});

  const handle = async (id: number, status: "처리완료" | "반려") => {
    setBusy(id);
    setError(null);
    try {
      await apiFetch(`/admin/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, memo: memo[id]?.trim() || undefined }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  if (reports.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
        처리할 신고가 없습니다 🎉
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-coral-500">
          {error}
        </p>
      )}

      {reports.map((r) => {
        const pending = r.status === "접수";
        const working = busy === r.id;

        return (
          <article key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={STATUS_TONE[r.status]}>{r.status}</Tag>
              <Tag tone="dark">{TARGET_LABEL[r.targetType]}</Tag>
              <span className="text-sm font-semibold text-gray-900">{r.reason}</span>
              <span className="ml-auto text-xs text-gray-400">
                {r.reporter ?? "알 수 없음"} · {formatRelative(r.createdAt)}
              </span>
            </div>

            <div className="mt-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
              {r.targetLabel ? (
                <>
                  <p className="text-sm text-gray-800">{r.targetLabel}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    작성자 {r.targetAuthor ?? "알 수 없음"}
                    {r.link && (
                      <Link
                        href={r.link}
                        target="_blank"
                        className="ml-2 inline-flex items-center gap-0.5 text-ocean-600 hover:underline"
                      >
                        원문 보기 <ExternalLink size={11} />
                      </Link>
                    )}
                  </p>
                </>
              ) : (
                // 대상이 이미 지워졌어도 신고 기록은 남는다 — 운영 이력이기 때문
                <p className="text-sm text-gray-400">삭제된 대상입니다.</p>
              )}
            </div>

            {r.detail && (
              <p className="mt-2 text-sm text-gray-600">
                <span className="text-xs font-semibold text-gray-400">신고 내용 · </span>
                {r.detail}
              </p>
            )}

            {pending ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={memo[r.id] ?? ""}
                  onChange={(e) => setMemo({ ...memo, [r.id]: e.target.value })}
                  maxLength={300}
                  placeholder="처리 메모 (선택)"
                  className="min-w-48 flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-ocean-400"
                />
                {working ? (
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void handle(r.id, "반려")}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      반려
                    </button>
                    <button
                      type="button"
                      onClick={() => void handle(r.id, "처리완료")}
                      className="rounded-lg bg-ocean-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-ocean-700"
                    >
                      처리완료
                    </button>
                  </>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-400">
                {r.handler ?? "운영진"} 처리
                {r.handledAt && ` · ${formatRelative(r.handledAt)}`}
                {r.handlerMemo && ` · ${r.handlerMemo}`}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
