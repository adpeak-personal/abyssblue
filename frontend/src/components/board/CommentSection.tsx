"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CornerDownRight, Heart, MessageCircle } from "lucide-react";
import { ApiError, apiFetch, type WithAuthor } from "@/lib/api";
import { Avatar, LevelBadge, Tag } from "@/components/ui";
import { ReportButton } from "./ReportButton";
import { formatRelative } from "@/lib/utils";
import type { Comment } from "@/types";

/** 서버가 로그인한 사람에게는 "내가 좋아요 눌렀는지" 까지 실어 보낸다 */
type Item = WithAuthor<Comment> & { liked?: boolean };

interface Me {
  id: number;
  level: string;
}

/**
 * 댓글 목록 + 작성 · 답글 · 수정 · 삭제.
 *
 * 서버에서 받은 목록으로 시작하고 이후는 화면 상태로 굴린다 —
 * 댓글 하나 달 때마다 글 전체를 다시 받아오면 본문까지 깜빡인다.
 * 권한은 백엔드가 다시 확인하므로 여기 조건은 화면 정리용이다.
 */
export function CommentSection({
  postId,
  postAuthorId,
  initial,
  me,
}: {
  postId: number;
  postAuthorId: number;
  initial: Item[];
  me: Me | null;
}) {
  const [comments, setComments] = useState<Item[]>(initial);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 답글이 부모 바로 아래 오도록 정렬한다 — 작성 시간순으로만 두면 멀리 떨어진다
  const ordered = useMemo(() => {
    const roots = comments.filter((c) => !c.parentId);
    const byParent = new Map<number, Item[]>();
    for (const c of comments) {
      if (!c.parentId) continue;
      byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
    }
    // 부모가 삭제된 답글도 보여야 하므로 묶이지 않은 건 뒤에 붙인다
    const placed = new Set<number>();
    const out: Item[] = [];
    for (const r of roots) {
      out.push(r);
      placed.add(r.id);
      for (const child of byParent.get(r.id) ?? []) {
        out.push(child);
        placed.add(child.id);
      }
    }
    return [...out, ...comments.filter((c) => !placed.has(c.id))];
  }, [comments]);

  const submit = async (content: string, parentId?: number) => {
    const created = await apiFetch<Item>(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, parentId }),
    });
    setComments((prev) => [...prev, created]);
  };

  const save = async (id: number, content: string) => {
    const updated = await apiFetch<Item>(`/comments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    });
    setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const remove = async (id: number) => {
    if (!confirm("이 댓글을 삭제할까요?")) return;
    setError(null);
    try {
      await apiFetch<void>(`/comments/${id}`, { method: "DELETE" });
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "댓글을 삭제하지 못했어요.");
    }
  };

  const canEdit = (c: Item) => me != null && (me.id === c.author.id || me.level === "운영진");

  const like = async (id: number) => {
    setError(null);
    try {
      const r = await apiFetch<{ liked: boolean; likes: number }>(`/comments/${id}/like`, {
        method: "POST",
      });
      // 직접 +1 하지 않고 서버가 준 값을 쓴다 — 다른 기기에서 누른 것과 어긋나지 않게
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, liked: r.liked, likes: r.likes } : c)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했어요.");
    }
  };

  return (
    <section className="border-t border-gray-100 px-5 py-5 sm:px-8">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
        <MessageCircle size={16} /> 댓글 {comments.length}
      </h2>

      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-sm text-coral-500">
          {error}
        </p>
      )}

      <ul className="mt-3 divide-y divide-gray-100">
        {ordered.map((c) => {
          const u = c.author;
          return (
            <li key={c.id} className={`flex gap-3 py-3.5 ${c.parentId ? "pl-8" : ""}`}>
              {c.parentId && <CornerDownRight size={14} className="-ml-5 mt-1 shrink-0 text-gray-300" />}
              <Avatar user={u} size={32} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  {u.nickname}
                  {u.id === postAuthorId && <Tag tone="ocean">작성자</Tag>}
                  <LevelBadge level={u.level} />
                </p>

                {editing === c.id ? (
                  <CommentBox
                    className="mt-1.5"
                    defaultValue={c.content}
                    submitLabel="수정"
                    autoFocus
                    onCancel={() => setEditing(null)}
                    onSubmit={async (text) => {
                      await save(c.id, text);
                      setEditing(null);
                    }}
                  />
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{c.content}</p>
                )}

                <p className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                  {/*
                    서버가 그린 뒤 브라우저가 이어받기까지 몇 초가 지나면
                    "방금 전" / "1분 전" 으로 갈릴 수 있다. 내용은 같은 뜻이라 경고만 끈다.
                  */}
                  <span suppressHydrationWarning>{formatRelative(c.createdAt)}</span>
                  {me && !c.parentId && (
                    <button
                      type="button"
                      onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                      className="hover:text-gray-600"
                    >
                      {replyTo === c.id ? "답글취소" : "답글쓰기"}
                    </button>
                  )}
                  {canEdit(c) && editing !== c.id && (
                    <button type="button" onClick={() => setEditing(c.id)} className="hover:text-gray-600">
                      수정
                    </button>
                  )}
                  {canEdit(c) && (
                    <button type="button" onClick={() => void remove(c.id)} className="hover:text-coral-500">
                      삭제
                    </button>
                  )}
                  {me && me.id !== c.author.id && (
                    <ReportButton targetType="comment" targetId={c.id} loggedIn />
                  )}
                  {me ? (
                    <button
                      type="button"
                      onClick={() => void like(c.id)}
                      aria-pressed={Boolean(c.liked)}
                      className={`flex items-center gap-0.5 ${
                        c.liked ? "text-coral-500" : "hover:text-coral-500"
                      }`}
                    >
                      <Heart size={11} fill={c.liked ? "currentColor" : "none"} /> {c.likes}
                    </button>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <Heart size={11} /> {c.likes}
                    </span>
                  )}
                </p>

                {replyTo === c.id && (
                  <CommentBox
                    className="mt-2"
                    placeholder={`${u.nickname} 님에게 답글 남기기`}
                    submitLabel="답글 등록"
                    autoFocus
                    onCancel={() => setReplyTo(null)}
                    onSubmit={async (text) => {
                      await submit(text, c.id);
                      setReplyTo(null);
                    }}
                  />
                )}
              </div>
            </li>
          );
        })}
        {ordered.length === 0 && (
          <li className="py-8 text-center text-sm text-gray-400">첫 댓글을 남겨보세요 🐠</li>
        )}
      </ul>

      {me ? (
        <CommentBox
          className="mt-3"
          label="댓글 쓰기"
          placeholder="댓글을 남겨보세요. 안전과 배려를 지켜주세요."
          rows={3}
          onSubmit={(text) => submit(text)}
        />
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-500">
          댓글을 남기려면{" "}
          <Link href="/login" className="font-semibold text-ocean-600 hover:underline">
            로그인
          </Link>
          이 필요해요.
        </p>
      )}
    </section>
  );
}

/**
 * 댓글 입력 상자 — 새 댓글 · 답글 · 수정이 모두 이걸 쓴다.
 *
 * 전송 결과(목록 갱신)는 부모가 책임지고, 여기서는 입력값과 전송 중 상태만 본다.
 */
function CommentBox({
  defaultValue = "",
  label,
  placeholder = "댓글을 입력하세요.",
  submitLabel = "등록",
  rows = 2,
  autoFocus,
  className,
  onSubmit,
  onCancel,
}: {
  defaultValue?: string;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  rows?: number;
  autoFocus?: boolean;
  className?: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const content = value.trim();
    if (!content) return setError("내용을 입력해 주세요.");

    setBusy(true);
    setError(null);
    try {
      await onSubmit(content);
      setValue(""); // 수정 상자는 바로 닫히므로 비워도 안 보인다
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-lg border border-gray-200 p-3 focus-within:border-ocean-400 ${className ?? ""}`}>
      {label && <p className="text-xs font-semibold text-gray-700">{label}</p>}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // 줄바꿈은 그냥 엔터 — 전송은 Ctrl/⌘+Enter 로 (실수로 올라가는 걸 막는다)
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void send();
          }
        }}
        rows={rows}
        maxLength={2000}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="mt-1 w-full resize-none text-sm outline-none"
      />
      {error && (
        <p role="alert" className="text-xs text-coral-500">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-[11px] text-gray-300">Ctrl + Enter 로 등록</span>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
        )}
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy}
          className="rounded-md bg-ocean-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-ocean-700 disabled:opacity-60"
        >
          {busy ? "처리 중…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
