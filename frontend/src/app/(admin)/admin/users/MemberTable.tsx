"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { Avatar, Tag } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { MEMBER_LEVELS, type Member, type MemberStatus } from "@/types/member";
import type { MemberLevel } from "@/types";

const STATUS_TONE: Record<MemberStatus, "gray" | "coral" | "dark"> = {
  활동: "gray",
  정지: "coral",
  탈퇴: "dark",
};

/** 정지 기간 선택지 — 무기한은 값 없음 */
const SUSPEND_DAYS = [
  { days: 3, label: "3일" },
  { days: 7, label: "7일" },
  { days: 30, label: "30일" },
  { days: undefined, label: "무기한" },
];

export function MemberTable({ members, myId }: { members: Member[]; myId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 정지 패널을 연 회원 */
  const [suspending, setSuspending] = useState<Member | null>(null);

  const run = async (id: number, fn: () => Promise<unknown>) => {
    setBusy(id);
    setError(null);
    try {
      await fn();
      // 서버 컴포넌트가 새 값으로 다시 그리게 한다
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  const changeLevel = (m: Member, level: MemberLevel) =>
    run(m.id, () =>
      apiFetch(`/admin/members/${m.id}/level`, {
        method: "PATCH",
        body: JSON.stringify({ level }),
      }),
    );

  const changeStatus = (m: Member, status: MemberStatus, days?: number, reason?: string) =>
    run(m.id, async () => {
      await apiFetch(`/admin/members/${m.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, days, reason }),
      });
      setSuspending(null);
    });

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-coral-500">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="py-2.5 pl-4 text-left font-medium">회원</th>
              <th className="w-28 py-2.5 text-left font-medium">등급</th>
              <th className="w-20 py-2.5 font-medium">상태</th>
              <th className="w-24 py-2.5 font-medium">활동</th>
              <th className="w-24 py-2.5 font-medium">가입</th>
              <th className="w-44 py-2.5 pr-4 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isMe = m.id === myId;
              const working = busy === m.id;

              return (
                <tr key={m.id} className="border-b border-gray-100 last:border-0 align-middle">
                  <td className="py-2.5 pl-4">
                    <div className="flex items-center gap-2">
                      <Avatar user={m} size={30} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-medium text-gray-900">
                          {m.nickname}
                          {isMe && <Tag tone="ocean">나</Tag>}
                          {m.reportCount > 0 && (
                            <span
                              title={`신고 ${m.reportCount}건`}
                              className="flex items-center gap-0.5 text-[11px] font-bold text-coral-500"
                            >
                              <ShieldAlert size={11} /> {m.reportCount}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[11px] text-gray-400">
                          {m.email}
                          {m.phoneMasked && ` · ${m.phoneMasked}`}
                          {m.provider && ` · ${m.provider}`}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5">
                    <select
                      value={m.level}
                      disabled={working || isMe}
                      onChange={(e) => changeLevel(m, e.target.value as MemberLevel)}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      {MEMBER_LEVELS.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </td>

                  <td className="py-2.5 text-center">
                    <Tag tone={STATUS_TONE[m.status]}>{m.status}</Tag>
                    {m.status === "정지" && (
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {m.suspendedUntil ? `~ ${formatDate(m.suspendedUntil)}` : "무기한"}
                      </p>
                    )}
                  </td>

                  <td className="py-2.5 text-center text-xs text-gray-500">
                    글 {m.postCount}
                    <br />
                    댓글 {m.commentCount}
                  </td>

                  <td className="py-2.5 text-center text-xs text-gray-500">
                    {formatDate(m.joinedAt)}
                  </td>

                  <td className="py-2.5 pr-4 text-right">
                    {working ? (
                      <Loader2 size={15} className="ml-auto animate-spin text-gray-400" />
                    ) : isMe ? (
                      <span className="text-xs text-gray-300">본인</span>
                    ) : m.status === "활동" ? (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSuspending(suspending?.id === m.id ? null : m)}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          정지
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!confirm(`${m.nickname} 님을 탈퇴 처리할까요?\n글과 댓글은 남습니다.`)) return;
                            void changeStatus(m, "탈퇴");
                          }}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-coral-500 hover:bg-orange-50"
                        >
                          탈퇴
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void changeStatus(m, "활동")}
                        className="rounded-md bg-ocean-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-ocean-700"
                      >
                        해제
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="py-14 text-center text-sm text-gray-400">
                  조건에 맞는 회원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {suspending && (
        <SuspendPanel
          member={suspending}
          onCancel={() => setSuspending(null)}
          onConfirm={(days, reason) => changeStatus(suspending, "정지", days, reason)}
        />
      )}
    </div>
  );
}

/** 정지 기간과 사유를 받는다 — 사유는 당사자에게 알림으로 전달된다 */
function SuspendPanel({
  member,
  onCancel,
  onConfirm,
}: {
  member: Member;
  onCancel: () => void;
  onConfirm: (days: number | undefined, reason: string) => void;
}) {
  const [days, setDays] = useState<number | undefined>(7);
  const [reason, setReason] = useState("");

  return (
    <div className="rounded-xl border border-coral-400 bg-orange-50 p-4">
      <p className="text-sm font-bold text-gray-900">{member.nickname} 님 이용 정지</p>
      <p className="mt-0.5 text-xs text-gray-500">
        정지 기간에는 글·댓글을 쓸 수 없습니다. 읽기와 로그인은 그대로예요.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUSPEND_DAYS.map((d) => (
          <button
            key={d.label}
            type="button"
            onClick={() => setDays(d.days)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              days === d.days
                ? "bg-coral-500 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={200}
        placeholder="사유 (당사자에게 알림으로 전달됩니다)"
        className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400"
      />

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => onConfirm(days, reason.trim())}
          className="rounded-lg bg-coral-500 px-4 py-1.5 text-sm font-semibold text-white hover:brightness-95"
        >
          정지하기
        </button>
      </div>
    </div>
  );
}
