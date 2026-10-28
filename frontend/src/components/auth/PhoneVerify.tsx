"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const inputCls = "w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2";
const okCls = "border-gray-200 focus:border-ocean-400 focus:ring-ocean-100";

/** 010-1234-5678 형태로 보기 좋게 */
export function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export interface PhoneVerifyProps {
  /** 인증번호 발송 경로 */
  sendPath: string;
  /** 인증번호 확인 경로 */
  verifyPath: string;
  /** 확인 응답에서 꺼낼 토큰 필드 이름 (가입: phoneToken, 재설정: resetToken) */
  tokenField: string;
  /** 두 요청 본문에 함께 실을 값 (재설정은 email 이 필요하다) */
  extra?: Record<string, unknown>;
  /** 보내기 전 검사 — 문자열을 돌려주면 그 메시지를 띄우고 발송하지 않는다 */
  beforeSend?: () => string | null;
  onVerified: (token: string) => void;
  label?: string;
  className?: string;
}

/**
 * 휴대폰 인증 한 묶음 — 번호 입력 · 발송 · 코드 확인까지.
 *
 * 가입 · 소셜 가입 · 비밀번호 찾기가 같은 UI 를 쓴다. 경로와 토큰 이름만 다르다.
 * 인증에 성공하면 토큰을 부모에게 넘기고, 그 뒤 처리(가입·재설정)는 부모가 한다.
 */
export function PhoneVerify({
  sendPath,
  verifyPath,
  tokenField,
  extra,
  beforeSend,
  onVerified,
  label = "휴대폰 인증",
  className,
}: PhoneVerifyProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0 && expiresIn <= 0) return;
    const t = setInterval(() => {
      setCooldown((n) => Math.max(0, n - 1));
      setExpiresIn((n) => Math.max(0, n - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown, expiresIn]);

  const sendCode = async () => {
    const blocked = beforeSend?.();
    if (blocked) return setError(blocked);

    setError(null);
    setBusy("send");
    try {
      const res = await apiFetch<{ expiresInMinutes: number; devCode?: string }>(sendPath, {
        method: "POST",
        body: JSON.stringify({ ...extra, phone }),
      });
      setSent(true);
      setCode("");
      setCooldown(180);
      setExpiresIn(res.expiresInMinutes * 60);
      setDevCode(res.devCode ?? null);
    } catch (err) {
      // 서버가 남은 시간을 알려주면 버튼 카운트다운을 그 값에 맞춘다
      if (err instanceof ApiError && err.retryAfterSeconds) setCooldown(err.retryAfterSeconds);
      setError(err instanceof ApiError ? err.message : "인증번호를 보내지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    setError(null);
    setBusy("verify");
    try {
      const res = await apiFetch<Record<string, string>>(verifyPath, {
        method: "POST",
        body: JSON.stringify({ ...extra, phone, code }),
      });
      const token = res[tokenField];
      if (!token) throw new ApiError("인증에 실패했습니다.", 500);
      setVerified(true);
      setExpiresIn(0);
      onVerified(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "인증에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn("rounded-xl border border-gray-200 p-3", className)}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
        {label}
        {verified && (
          <span className="flex items-center gap-0.5 text-emerald-600">
            <Check size={13} /> 완료
          </span>
        )}
      </p>

      <div className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="010-0000-0000"
          autoComplete="tel"
          disabled={verified}
          className={cn(inputCls, okCls, "flex-1", verified && "bg-gray-50 text-gray-500")}
        />
        <button
          type="button"
          onClick={sendCode}
          disabled={
            Boolean(busy) || verified || cooldown > 0 || phone.replace(/\D/g, "").length < 10
          }
          className="shrink-0 rounded-lg border border-ocean-600 px-3 text-sm font-semibold text-ocean-600 hover:bg-ocean-50 disabled:border-gray-200 disabled:text-gray-400"
        >
          {busy === "send" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : cooldown > 0 ? (
            `${cooldown}초`
          ) : sent ? (
            "재발송"
          ) : (
            "인증번호"
          )}
        </button>
      </div>

      {sent && !verified && (
        <div className="mt-2 flex gap-2">
          <input
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="인증번호 6자리"
            className={cn(inputCls, okCls, "flex-1")}
          />
          <button
            type="button"
            onClick={verify}
            disabled={Boolean(busy) || code.length !== 6}
            className="shrink-0 rounded-lg bg-ocean-600 px-4 text-sm font-semibold text-white hover:bg-ocean-700 disabled:opacity-50"
          >
            {busy === "verify" ? <Loader2 size={15} className="animate-spin" /> : "확인"}
          </button>
        </div>
      )}

      {sent && !verified && expiresIn > 0 && (
        <p className="mt-1.5 text-[11px] text-gray-400">입력 제한 시간 {mmss(expiresIn)}</p>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-[11px] text-coral-500">
          {error}
        </p>
      )}

      {/* 문자 발송이 설정되지 않은 개발 환경에서만 보인다 */}
      {devCode && !verified && (
        <button
          type="button"
          onClick={() => setCode(devCode)}
          className="mt-2 flex w-full items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-left text-xs text-amber-900 hover:bg-amber-100"
        >
          <span>
            <b>개발 모드</b> — 문자 발송이 설정되지 않아 인증번호를 여기 표시합니다
          </span>
          <span className="ml-2 shrink-0 font-mono text-sm font-bold tracking-widest">
            {devCode}
          </span>
        </button>
      )}
    </div>
  );
}
