"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { CertAgency } from "@/types";
import type { Profile } from "@/lib/session";

const inputCls = "w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2";
const okCls = "border-gray-200 focus:border-ocean-400 focus:ring-ocean-100";
const AGENCIES: CertAgency[] = ["PADI", "SSI", "NAUI", "CMAS", "SDI", "KUDA"];

/** 아바타 배경색 — 사진 업로드 대신 고르는 방식이라 보기 좋은 값만 둔다 */
const COLORS = [
  "#0e7490", "#be185d", "#4d7c0f", "#b45309", "#6d28d9",
  "#0369a1", "#c2410c", "#15803d", "#7e22ce", "#334155",
];

export function ProfileForm({ me }: { me: Profile }) {
  const router = useRouter();

  const [nickname, setNickname] = useState(me.nickname);
  const [nick, setNick] = useState<{ status: "idle" | "checking" | "ok" | "taken"; reason?: string }>({
    status: "idle",
  });
  const [certAgency, setCertAgency] = useState<CertAgency>(me.certAgency);
  const [certLevel, setCertLevel] = useState(me.certLevel);
  const [bio, setBio] = useState(me.bio ?? "");
  const [avatarColor, setAvatarColor] = useState(me.avatarColor);

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed =
    nickname.trim() !== me.nickname ||
    certAgency !== me.certAgency ||
    certLevel.trim() !== me.certLevel ||
    bio !== (me.bio ?? "") ||
    avatarColor !== me.avatarColor;

  /** 입력칸을 벗어날 때 중복 확인 — 내 닉네임 그대로면 확인할 필요가 없다 */
  const checkNickname = async () => {
    const value = nickname.trim();
    if (!value || value === me.nickname) return setNick({ status: "idle" });
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
      setNick({ status: "idle" });
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changed || nick.status === "taken") return;

    setBusy(true);
    setError(null);
    try {
      await apiFetch("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          nickname: nickname.trim(),
          certAgency,
          certLevel: certLevel.trim(),
          bio,
          avatarColor,
        }),
      });
      setSaved(true);
      // 헤더·사이드바의 닉네임과 아바타도 새 값으로 다시 그려야 한다
      router.refresh();
      setTimeout(() => router.push("/mypage"), 700);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "저장하지 못했어요.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} method="post" className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-4">
        <Avatar user={{ nickname: nickname || me.nickname, avatarColor }} size={64} />
        <div>
          <p className="text-xs font-semibold text-gray-600">프로필 색상</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAvatarColor(c)}
                aria-label={`색상 ${c}`}
                className={cn(
                  "h-7 w-7 rounded-full transition",
                  avatarColor === c && "ring-2 ring-ocean-500 ring-offset-2",
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">닉네임</label>
        <div className="relative">
          <input
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setNick({ status: "idle" });
            }}
            onBlur={checkNickname}
            maxLength={20}
            className={cn(inputCls, nick.status === "taken" ? "border-coral-400" : okCls, "pr-10")}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {nick.status === "checking" && <Loader2 size={15} className="animate-spin text-gray-400" />}
            {nick.status === "ok" && <Check size={16} className="text-emerald-600" />}
          </span>
        </div>
        {nick.status === "taken" && <p className="mt-1 text-[11px] text-coral-500">{nick.reason}</p>}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">자격증</label>
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
            maxLength={100}
            placeholder="예: Advanced Open Water"
            className={cn(inputCls, okCls, "flex-1")}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">한 줄 소개</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="다른 다이버에게 나를 소개해 주세요."
          className={cn(inputCls, okCls, "resize-none")}
        />
        <p className="mt-1 text-right text-[11px] text-gray-400">{bio.length}/500</p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-coral-500">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-400">
          이메일과 휴대폰 번호는 바꿀 수 없어요. 등급은 활동에 따라 자동으로 올라갑니다.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={busy || !changed || nick.status === "taken"}
            className="flex items-center gap-2 rounded-lg bg-ocean-600 px-5 py-2 text-sm font-semibold text-white hover:bg-ocean-700 disabled:opacity-60"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {saved ? "저장했어요" : "저장"}
          </button>
        </div>
      </div>
    </form>
  );
}
