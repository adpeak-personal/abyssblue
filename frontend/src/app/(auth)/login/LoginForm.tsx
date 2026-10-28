"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";

/** 소셜 로그인 콜백이 알려주는 상황별 안내 */
const SOCIAL_MESSAGES: Record<string, string> = {
  cancelled: "간편 로그인을 취소했어요.",
  invalid: "로그인 요청이 올바르지 않습니다. 다시 시도해 주세요.",
  failed: "간편 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.",
};

const inputCls =
  "w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  /** 로그인이 필요해서 튕겨 온 경우 원래 가려던 곳으로 돌려보낸다 */
  const next = params.get("next") ?? "/";

  // 소셜 로그인이 중간에 끊겼을 때 콜백이 붙여 보내는 값
  const socialIssue = SOCIAL_MESSAGES[params.get("social") ?? ""];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      // 서버 컴포넌트가 새 로그인 상태로 다시 그려지도록
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인하지 못했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      // 하이드레이션 전에 제출되면 기본 동작(GET)으로 비밀번호가 URL 에 실린다.
      // POST 로 두면 그런 일이 없다 — JS 가 뜨면 onSubmit 이 가로챈다.
      method="post"
      className="mt-7 space-y-3"
    >
      <input
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일"
        autoComplete="email"
        required
        className={inputCls}
      />
      <input
        type="password"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        autoComplete="current-password"
        required
        className={inputCls}
      />

      {(error ?? socialIssue) && (
        <p role="alert" className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-coral-500">
          {error ?? socialIssue}
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-xs text-gray-400">로그인 상태는 30일간 유지됩니다</span>
        <Link href="/forgot" className="text-gray-400 hover:text-ocean-600">
          비밀번호 찾기
        </Link>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-ocean-600 py-3 font-semibold text-white hover:bg-ocean-700 disabled:opacity-60"
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        로그인
      </button>
    </form>
  );
}
