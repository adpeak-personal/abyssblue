"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Loader2, Pin, RotateCcw, Trash2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { Tag } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/utils";
import type { BoardGroup, ListPost } from "@/types";

export type AdminPost = ListPost & { deletedAt?: string };

export function PostAdminTable({
  posts,
  boardGroups,
}: {
  posts: AdminPost[];
  boardGroups: BoardGroup[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (id: number, fn: () => Promise<unknown>) => {
    setBusy(id);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  const toggleNotice = (p: AdminPost) =>
    run(p.id, () =>
      apiFetch(`/admin/posts/${p.id}/notice`, {
        method: "PATCH",
        body: JSON.stringify({ isNotice: !p.isNotice }),
      }),
    );

  const move = (p: AdminPost, boardSlug: string) =>
    run(p.id, () =>
      apiFetch(`/admin/posts/${p.id}/board`, {
        method: "PATCH",
        body: JSON.stringify({ boardSlug }),
      }),
    );

  const remove = (p: AdminPost) => {
    const reason = prompt(`"${p.title}" 을(를) 삭제합니다.\n사유를 적으면 글쓴이에게 알림으로 전달됩니다. (선택)`);
    // prompt 는 취소하면 null — 빈 문자열(그냥 확인)과 구분해야 한다
    if (reason === null) return;
    return run(p.id, () =>
      apiFetch(`/admin/posts/${p.id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      }),
    );
  };

  const restore = (p: AdminPost) =>
    run(p.id, () => apiFetch(`/admin/posts/${p.id}/restore`, { method: "POST" }));

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
              <th className="py-2.5 pl-4 text-left font-medium">제목</th>
              <th className="w-36 py-2.5 text-left font-medium">게시판</th>
              <th className="w-28 py-2.5 text-left font-medium">작성자</th>
              <th className="w-20 py-2.5 font-medium">작성일</th>
              <th className="w-20 py-2.5 font-medium">조회</th>
              <th className="w-28 py-2.5 pr-4 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => {
              const working = busy === p.id;
              const deleted = Boolean(p.deletedAt);

              return (
                <tr
                  key={p.id}
                  className={`border-b border-gray-100 align-middle last:border-0 ${
                    deleted ? "bg-gray-50 text-gray-400" : ""
                  }`}
                >
                  <td className="py-2.5 pl-4">
                    <div className="flex items-center gap-1.5">
                      {p.isNotice && <Tag tone="ocean">공지</Tag>}
                      {deleted && <Tag tone="dark">삭제됨</Tag>}
                      {p.category && !p.isNotice && (
                        <span className="shrink-0 text-xs text-ocean-600">[{p.category}]</span>
                      )}
                      <Link
                        href={`/board/${p.boardSlug}/${p.id}`}
                        target="_blank"
                        className="line-clamp-1 hover:underline"
                      >
                        {p.title}
                      </Link>
                      {p.commentCount > 0 && (
                        <span className="shrink-0 text-xs font-bold text-coral-500">
                          [{p.commentCount}]
                        </span>
                      )}
                      <ExternalLink size={11} className="shrink-0 text-gray-300" />
                    </div>
                  </td>

                  <td className="py-2.5">
                    <select
                      value={p.boardSlug}
                      disabled={working || deleted}
                      onChange={(e) => move(p, e.target.value)}
                      className="w-32 rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      {boardGroups.map((g) => (
                        <optgroup key={g.id} label={g.name}>
                          {g.boards.map((b) => (
                            <option key={b.slug} value={b.slug}>
                              {b.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>

                  <td className="py-2.5 truncate text-xs text-gray-500">
                    {p.author?.nickname ?? "알 수 없음"}
                  </td>
                  <td className="py-2.5 text-center text-xs text-gray-500">
                    {formatDate(p.createdAt)}
                  </td>
                  <td className="py-2.5 text-center text-xs text-gray-500">
                    {formatNumber(p.views)}
                  </td>

                  <td className="py-2.5 pr-4 text-right">
                    {working ? (
                      <Loader2 size={15} className="ml-auto animate-spin text-gray-400" />
                    ) : deleted ? (
                      <button
                        type="button"
                        onClick={() => void restore(p)}
                        title="되살리기"
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        <RotateCcw size={12} /> 복구
                      </button>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void toggleNotice(p)}
                          title={p.isNotice ? "공지 해제" : "공지로 지정"}
                          aria-pressed={p.isNotice}
                          className={`rounded-md border p-1.5 ${
                            p.isNotice
                              ? "border-ocean-400 bg-ocean-50 text-ocean-600"
                              : "border-gray-200 text-gray-400 hover:bg-gray-50"
                          }`}
                        >
                          <Pin size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(p)}
                          title="삭제"
                          className="rounded-md border border-gray-200 p-1.5 text-coral-500 hover:bg-orange-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {posts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-14 text-center text-sm text-gray-400">
                  조건에 맞는 글이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
