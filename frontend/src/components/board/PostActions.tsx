"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";

/**
 * 글 더보기 메뉴 — 수정 / 삭제.
 *
 * 보여줄지 말지는 서버 컴포넌트가 판단해서 이 컴포넌트를 아예 안 넣는다.
 * 권한 자체는 백엔드가 다시 확인하므로 화면이 유일한 방어선은 아니다.
 */
export function PostActions({ slug, postId }: { slug: string; postId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onDelete = async () => {
    // 삭제는 되돌릴 수 없으니 한 번 묻는다
    if (!confirm("이 글을 삭제할까요? 삭제한 글은 목록에서 사라집니다.")) return;

    setBusy(true);
    setError(null);
    try {
      await apiFetch<void>(`/posts/${postId}`, { method: "DELETE" });
      router.replace(`/board/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "글을 삭제하지 못했어요.");
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
        aria-label="더보기"
        aria-expanded={open}
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-10 w-32 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => router.push(`/board/${slug}/${postId}/edit`)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil size={14} /> 수정
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-coral-500 hover:bg-orange-50 disabled:opacity-60"
          >
            <Trash2 size={14} /> {busy ? "삭제 중…" : "삭제"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="absolute right-0 top-10 z-10 w-56 rounded-lg bg-orange-50 px-3 py-2 text-xs text-coral-500 shadow">
          {error}
        </p>
      )}
    </div>
  );
}
