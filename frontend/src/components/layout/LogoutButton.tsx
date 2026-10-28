"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { apiFetch } from "@/lib/api";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // 실패해도 화면은 로그아웃 상태로 되돌린다 — 쿠키가 이미 만료됐을 수 있다
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      aria-label="로그아웃"
      title="로그아웃"
      className="hidden rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 lg:block"
    >
      <LogOut size={18} />
    </button>
  );
}
