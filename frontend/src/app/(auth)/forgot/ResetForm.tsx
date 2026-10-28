"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { PhoneVerify } from "@/components/auth/PhoneVerify";
import { cn } from "@/lib/utils";

const inputCls = "w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2";
const okCls = "border-gray-200 focus:border-ocean-400 focus:ring-ocean-100";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * 비밀번호 재설정 — 가입 때 인증한 휴대폰으로 본인 확인을 한다.
 *
 * 이메일과 번호가 안 맞아도 "그런 계정 없다" 고 알려주지 않는다 (서버도 마찬가지다).
 * 가입 여부가 새면 안 되기 때문이고, 대신 문자가 오지 않으므로 틀린 사람은 진행할 수 없다.
 */
export function ResetForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = EMAIL_RE.test(email.trim());
  const pwTooShort = password.length > 0 && password.length < 8;
  const pwMismatch = password2.length > 0 && password !== password2;
  const canSubmit = Boolean(resetToken) && password.length >= 8 && password === password2 && !busy;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);
    try {
      await apiFetch("/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ resetToken, password }),
      });
      // 서버가 바로 로그인시켜 준다 — 다시 입력하게 할 이유가 없다
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "비밀번호를 바꾸지 못했습니다.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} method="post" className="mt-7 space-y-3">
      <div>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="가입한 이메일"
          autoComplete="email"
          disabled={Boolean(resetToken)}
          className={cn(inputCls, okCls, resetToken && "bg-gray-50 text-gray-500")}
        />
        <p className="mt-1 text-[11px] text-gray-400">
          가입할 때 인증한 휴대폰 번호로 인증번호를 보내드려요.
        </p>
      </div>

      <PhoneVerify
        sendPath="/auth/password/send"
        verifyPath="/auth/password/verify"
        tokenField="resetToken"
        extra={{ email: email.trim() }}
        beforeSend={() => (emailOk ? null : "이메일을 먼저 올바르게 입력해 주세요.")}
        onVerified={setResetToken}
        label="본인 확인"
      />

      {resetToken && (
        <>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="새 비밀번호 (8자 이상)"
            autoComplete="new-password"
            className={cn(inputCls, okCls)}
          />
          {pwTooShort && <p className="text-[11px] text-coral-500">8자 이상으로 입력해 주세요.</p>}

          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="새 비밀번호 확인"
            autoComplete="new-password"
            className={cn(inputCls, okCls)}
          />
          {pwMismatch && <p className="text-[11px] text-coral-500">비밀번호가 일치하지 않습니다.</p>}
        </>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-coral-500">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-ocean-600 py-3 font-semibold text-white hover:bg-ocean-700 disabled:opacity-60"
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        {resetToken ? "비밀번호 변경" : "본인 확인 후 변경할 수 있어요"}
      </button>
    </form>
  );
}
