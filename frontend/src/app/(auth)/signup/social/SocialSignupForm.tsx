"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { PhoneVerify } from "@/components/auth/PhoneVerify";
import { cn } from "@/lib/utils";
import type { CertAgency } from "@/types";

const inputCls = "w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2";
const okCls = "border-gray-200 focus:border-ocean-400 focus:ring-ocean-100";
const AGENCIES: CertAgency[] = ["PADI", "SSI", "NAUI", "CMAS", "SDI", "KUDA"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * 소셜 로그인으로 처음 들어온 사람의 추가 정보 입력.
 *
 * 소셜은 닉네임·자격증을 알려주지 않고, 이 커뮤니티는 가입에 휴대폰 인증이 필요하다.
 * 그래서 소셜 계정을 확인한 뒤 한 번 더 받는다. 비밀번호는 받지 않는다 —
 * 로그인은 소셜로 하고, 나중에 필요하면 "비밀번호 찾기" 로 설정하면 된다.
 */
export function SocialSignupForm({
  defaultEmail,
  defaultNickname,
}: {
  defaultEmail: string;
  defaultNickname: string;
}) {
  const router = useRouter();

  const [email, setEmail] = useState(defaultEmail);
  const [nickname, setNickname] = useState(defaultNickname);
  const [nick, setNick] = useState<{ status: "idle" | "checking" | "ok" | "taken"; reason?: string }>(
    { status: "idle" },
  );
  const [certAgency, setCertAgency] = useState<CertAgency>("PADI");
  const [certLevel, setCertLevel] = useState("Open Water");
  const [phoneToken, setPhoneToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = EMAIL_RE.test(email.trim());
  const verified = phoneToken.length > 0;

  /** 입력칸을 벗어날 때 중복 확인 */
  const checkNickname = async () => {
    const value = nickname.trim();
    if (!value) return setNick({ status: "idle" });
    if (value.length < 2 || value.length > 20) {
      return setNick({ status: "taken", reason: "닉네임은 2~20자로 입력해 주세요." });
    }

    setNick({ status: "checking" });
    try {
      const res = await apiFetch<{ available: boolean; reason?: string }>(
        `/auth/check-nickname?nickname=${encodeURIComponent(value)}`,
      );
      setNick(
        res.available
          ? { status: "ok" }
          : { status: "taken", reason: res.reason ?? "이미 사용 중인 닉네임입니다." },
      );
    } catch {
      // 확인에 실패해도 가입을 막지 않는다 — 최종 판단은 서버가 한다
      setNick({ status: "idle" });
    }
  };

  const canSubmit =
    emailOk && nickname.trim().length >= 2 && nick.status !== "taken" && verified && !busy;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);
    try {
      await apiFetch("/auth/signup/social", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          nickname: nickname.trim(),
          certAgency,
          certLevel: certLevel.trim(),
          phoneToken,
        }),
      });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "가입하지 못했습니다.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} method="post" className="mt-7 space-y-3">
      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          autoComplete="email"
          className={cn(inputCls, okCls)}
        />
        {email.trim() && !emailOk && (
          <p className="mt-1 text-[11px] text-coral-500">이메일 형식이 올바르지 않습니다.</p>
        )}
      </div>

      <div>
        <div className="relative">
          <input
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setNick({ status: "idle" });
            }}
            onBlur={checkNickname}
            placeholder="닉네임 (2~20자)"
            maxLength={20}
            className={cn(inputCls, nick.status === "taken" ? "border-coral-400" : okCls, "pr-10")}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {nick.status === "checking" && (
              <Loader2 size={15} className="animate-spin text-gray-400" />
            )}
            {nick.status === "ok" && <Check size={16} className="text-emerald-600" />}
          </span>
        </div>
        {nick.status === "taken" && (
          <p className="mt-1 text-[11px] text-coral-500">{nick.reason}</p>
        )}
      </div>

      <PhoneVerify
        sendPath="/auth/phone/send"
        verifyPath="/auth/phone/verify"
        tokenField="phoneToken"
        onVerified={setPhoneToken}
      />

      <div className="flex gap-2">
        <select
          value={certAgency}
          onChange={(e) => setCertAgency(e.target.value as CertAgency)}
          className={cn(inputCls, okCls, "w-32 shrink-0")}
        >
          {AGENCIES.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <input
          value={certLevel}
          onChange={(e) => setCertLevel(e.target.value)}
          placeholder="자격 등급 (예: Open Water)"
          className={cn(inputCls, okCls, "flex-1")}
        />
      </div>

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
        {verified ? "가입하기" : "휴대폰 인증 후 가입할 수 있어요"}
      </button>
    </form>
  );
}
