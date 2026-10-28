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
const badCls = "border-coral-400 focus:border-coral-400 focus:ring-orange-100";

const AGENCIES: CertAgency[] = ["PADI", "SSI", "NAUI", "CMAS", "SDI", "KUDA"];

/** 브라우저 기본 검증보다 엄격하게 — a@b 같은 건 거른다 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** 입력칸 아래 안내 — 기본은 빨강, ok 면 초록 */
function Hint({ ok, children }: { ok?: boolean; children?: React.ReactNode }) {
  if (!children) return null;
  return <p className={cn("mt-1 text-[11px]", ok ? "text-emerald-600" : "text-coral-500")}>{children}</p>;
}

type NickState = { status: "idle" | "checking" | "ok" | "taken"; reason?: string };

export function SignupForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [pwTouched, setPwTouched] = useState(false);

  const [nickname, setNickname] = useState("");
  const [nick, setNick] = useState<NickState>({ status: "idle" });

  /** 인증이 끝나면 PhoneVerify 가 토큰을 준다 — 이게 있어야 가입할 수 있다 */
  const [phoneToken, setPhoneToken] = useState("");
  const verified = phoneToken.length > 0;

  const [certAgency, setCertAgency] = useState<CertAgency>("PADI");
  const [certLevel, setCertLevel] = useState("Open Water");

  const [busy, setBusy] = useState<"signup" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── 검증 ────────────────────────────────────────────────
  /**
   * 입력칸을 벗어날 때 형식과 사용 가능 여부를 본다.
   *
   * 막힌 주소(운영진 흉내)는 여기서 걸러 준다 — 휴대폰 인증까지 다 하고
   * 마지막에 거절당하면 문자 비용만 쓰고 헛걸음이 된다.
   */
  const checkEmail = async () => {
    const value = email.trim();
    if (!value) return setEmailError(null);
    if (!EMAIL_RE.test(value)) return setEmailError("이메일 형식이 올바르지 않습니다.");

    try {
      const res = await apiFetch<{ available: boolean; reason?: string }>(
        `/auth/check-email?email=${encodeURIComponent(value)}`,
      );
      setEmailError(res.available ? null : (res.reason ?? "사용할 수 없는 이메일입니다."));
    } catch {
      // 확인에 실패해도 가입을 막지는 않는다 — 최종 판단은 서버가 한다
      setEmailError(null);
    }
  };

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
      // 확인에 실패해도 가입을 막지는 않는다 — 최종 판단은 서버가 한다
      setNick({ status: "idle" });
    }
  };

  const pwTooShort = pwTouched && password.length > 0 && password.length < 8;
  const pwMismatch = pwTouched && password2.length > 0 && password !== password2;
  const pwMatch = password2.length > 0 && password === password2 && password.length >= 8;

  // ── 제출 ────────────────────────────────────────────────
  const canSubmit =
    verified &&
    EMAIL_RE.test(email.trim()) &&
    password.length >= 8 &&
    password === password2 &&
    nickname.trim().length >= 2 &&
    nick.status !== "taken" &&
    certLevel.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;

    setBusy("signup");
    try {
      await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
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
      setBusy(null);
    }
  };

  return (
    <form
      onSubmit={submit}
      // 하이드레이션 전에 제출되면 기본 동작(GET)으로 비밀번호가 URL 에 실린다.
      // POST 로 두면 그런 일이 없다 — JS 가 뜨면 onSubmit 이 가로챈다.
      method="post"
      className="mt-6 space-y-3"
    >
      {/* 이메일 */}
      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          onBlur={() => void checkEmail()}
          placeholder="이메일"
          autoComplete="email"
          required
          className={cn(inputCls, emailError ? badCls : okCls)}
        />
        <Hint>{emailError}</Hint>
      </div>

      {/* 비밀번호 */}
      <div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setPwTouched(true)}
          placeholder="비밀번호 (8자 이상)"
          autoComplete="new-password"
          minLength={8}
          required
          className={cn(inputCls, pwTooShort ? badCls : okCls)}
        />
        <Hint>{pwTooShort ? "비밀번호는 8자 이상이어야 합니다." : null}</Hint>
      </div>

      {/* 비밀번호 확인 */}
      <div>
        <input
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          onBlur={() => setPwTouched(true)}
          placeholder="비밀번호 확인"
          autoComplete="new-password"
          required
          className={cn(inputCls, pwMismatch ? badCls : okCls)}
        />
        <Hint ok={pwMatch}>
          {pwMismatch ? "비밀번호가 일치하지 않습니다." : pwMatch ? "비밀번호가 일치합니다." : null}
        </Hint>
      </div>

      {/* 닉네임 — 입력칸을 벗어나면 중복 확인 */}
      <div>
        <div className="relative">
          <input
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              if (nick.status !== "idle") setNick({ status: "idle" });
            }}
            onBlur={checkNickname}
            placeholder="닉네임 (2~20자)"
            minLength={2}
            maxLength={20}
            required
            className={cn(inputCls, nick.status === "taken" ? badCls : okCls, "pr-10")}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {nick.status === "checking" && <Loader2 size={15} className="animate-spin text-gray-400" />}
            {nick.status === "ok" && <Check size={16} className="text-emerald-600" />}
          </span>
        </div>
        <Hint ok={nick.status === "ok"}>
          {nick.status === "taken"
            ? nick.reason
            : nick.status === "ok"
              ? "사용할 수 있는 닉네임입니다."
              : null}
        </Hint>
      </div>

      <PhoneVerify
        sendPath="/auth/phone/send"
        verifyPath="/auth/phone/verify"
        tokenField="phoneToken"
        onVerified={setPhoneToken}
      />

      {/* 자격증 */}
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
          required
          className={cn(inputCls, okCls)}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-coral-500">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={Boolean(busy) || !canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-ocean-600 py-3 font-semibold text-white hover:bg-ocean-700 disabled:opacity-50"
      >
        {busy === "signup" && <Loader2 size={16} className="animate-spin" />}
        {verified ? "가입하기" : "휴대폰 인증 후 가입할 수 있어요"}
      </button>
    </form>
  );
}
