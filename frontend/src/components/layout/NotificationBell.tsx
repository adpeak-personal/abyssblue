"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Avatar } from "@/components/ui";
import { formatRelative } from "@/lib/utils";
import type { Notification } from "@/types/member";

const TYPE_ICON: Record<Notification["type"], string> = {
  댓글: "💬",
  답글: "↩️",
  좋아요: "❤️",
  공지: "📢",
  운영: "⚓",
};

/**
 * 헤더의 알림 종.
 *
 * 처음에는 서버가 세어 준 개수만 들고 있다가, 열 때 목록을 받아온다 —
 * 모든 페이지에서 알림 목록까지 미리 불러올 이유가 없다.
 */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  // 페이지를 옮기면 서버가 다시 세어 준다. 그 값이 바뀌면 화면 값도 맞춘다.
  // (effect 가 아니라 렌더 중에 맞추는 게 React 가 권하는 방식이다)
  const [lastFromServer, setLastFromServer] = useState(initialUnread);
  if (lastFromServer !== initialUnread) {
    setLastFromServer(initialUnread);
    setUnread(initialUnread);
  }
  const [items, setItems] = useState<Notification[] | null>(null);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || items) return;

    setLoading(true);
    try {
      const res = await apiFetch<{ items: Notification[]; unread: number }>("/me/notifications");
      setItems(res.items);
      setUnread(res.unread);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const readAll = async () => {
    try {
      await apiFetch("/me/notifications/read", { method: "POST", body: JSON.stringify({}) });
      setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
      setUnread(0);
    } catch {
      /* 읽음 처리 실패는 조용히 넘어간다 — 다시 누르면 된다 */
    }
  };

  const openItem = async (n: Notification) => {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
      setUnread((u) => Math.max(0, u - 1));
      void apiFetch("/me/notifications/read", {
        method: "POST",
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {});
    }
    router.push(n.link);
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100"
        aria-label={unread > 0 ? `알림 ${unread}건` : "알림"}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <p className="text-sm font-bold text-gray-900">알림</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void readAll()}
                className="text-xs text-ocean-600 hover:underline"
              >
                모두 읽음
              </button>
            )}
          </div>

          <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
            {loading && (
              <li className="flex justify-center py-10">
                <Loader2 size={18} className="animate-spin text-gray-300" />
              </li>
            )}

            {!loading &&
              items?.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void openItem(n)}
                    className={`flex w-full gap-2.5 px-4 py-3 text-left hover:bg-gray-50 ${
                      n.read ? "" : "bg-ocean-50/40"
                    }`}
                  >
                    {n.actor ? (
                      <Avatar user={n.actor} size={30} />
                    ) : (
                      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm">
                        {TYPE_ICON[n.type]}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm text-gray-700">{n.message}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400" suppressHydrationWarning>
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral-500" />}
                  </button>
                </li>
              ))}

            {!loading && items?.length === 0 && (
              <li className="py-12 text-center text-sm text-gray-400">
                아직 알림이 없어요 🔔
              </li>
            )}
          </ul>

          <Link
            href="/mypage"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 py-2.5 text-center text-xs text-gray-500 hover:bg-gray-50"
          >
            마이페이지로 가기
          </Link>
        </div>
      )}
    </div>
  );
}
