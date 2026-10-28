import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { MemberLevel, User } from "@/types";
import { cn } from "@/lib/utils";

/**
 * 작성자를 못 찾았을 때 쓰는 자리 표시.
 *
 * 탈퇴하거나 지워진 회원의 글이 목록에 남을 수 있다. 예전에는 그럴 때
 * 화면이 통째로 죽었다 — 한 줄이 비는 것보다 나쁜 결과다.
 */
export const UNKNOWN_AUTHOR = { nickname: "알 수 없음", avatarColor: "#94a3b8" };

export function Avatar({
  user,
  size = 28,
}: {
  user: Pick<User, "nickname" | "avatarColor"> | null | undefined;
  size?: number;
}) {
  const { nickname, avatarColor } = user ?? UNKNOWN_AUTHOR;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: avatarColor, fontSize: size * 0.42 }}
      aria-hidden
    >
      {nickname.slice(0, 1)}
    </span>
  );
}

const LEVEL_STYLE: Record<MemberLevel, { icon: string; cls: string }> = {
  새싹: { icon: "🌱", cls: "bg-lime-50 text-lime-700" },
  물방울: { icon: "💧", cls: "bg-sky-50 text-sky-700" },
  파도: { icon: "🌊", cls: "bg-ocean-50 text-ocean-700" },
  산호: { icon: "🪸", cls: "bg-rose-50 text-rose-700" },
  고래: { icon: "🐋", cls: "bg-indigo-50 text-indigo-700" },
  운영진: { icon: "⚓", cls: "bg-ocean-900 text-white" },
};

export function LevelBadge({
  level,
  className,
}: {
  level: MemberLevel | null | undefined;
  className?: string;
}) {
  // 등급을 모르면 배지를 아예 안 그린다 — 빈 상자가 붙는 것보다 낫다
  const s = level ? LEVEL_STYLE[level] : undefined;
  if (!s) return null;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium", s.cls, className)}>
      <span aria-hidden>{s.icon}</span>
      {level}
    </span>
  );
}

export function UserChip({
  user,
  showLevel = true,
}: {
  user: Pick<User, "nickname" | "avatarColor" | "level"> | null | undefined;
  showLevel?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar user={user} size={22} />
      <span className="text-sm text-gray-700">{user?.nickname ?? UNKNOWN_AUTHOR.nickname}</span>
      {showLevel && <LevelBadge level={user?.level} />}
    </span>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-gray-200 bg-white", className)}>{children}</section>;
}

export function SectionHeader({ title, href, sub }: { title: React.ReactNode; href?: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
      <h2 className="flex items-baseline gap-2 text-[15px] font-bold text-gray-900">
        {title}
        {sub && <span className="text-xs font-normal text-gray-400">{sub}</span>}
      </h2>
      {href && (
        <Link href={href} className="flex items-center text-xs text-gray-400 hover:text-ocean-600">
          더보기 <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

export function Tag({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "ocean" | "coral" | "green" | "dark" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-600",
    ocean: "bg-ocean-50 text-ocean-700",
    coral: "bg-orange-50 text-coral-500",
    green: "bg-emerald-50 text-emerald-700",
    dark: "bg-gray-800 text-white",
  };
  return <span className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

/** 이미지 대신 쓰는 그라디언트 + 물결 썸네일 */
export function Thumb({ gradient = "deep", className, label }: { gradient?: string; className?: string; label?: string }) {
  return (
    <div className={cn("relative overflow-hidden", `grad-${gradient}`, className)}>
      <svg className="absolute inset-x-0 bottom-0 w-full opacity-30" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
        <path d="M0 30 Q50 10 100 30 T200 30 T300 30 T400 30 V60 H0Z" fill="white" />
      </svg>
      <span className="absolute left-[18%] top-[30%] h-2 w-2 rounded-full bg-white/50" />
      <span className="absolute left-[24%] top-[20%] h-1.5 w-1.5 rounded-full bg-white/40" />
      <span className="absolute left-[21%] top-[12%] h-1 w-1 rounded-full bg-white/30" />
      {label && <span className="absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-white">{label}</span>}
    </div>
  );
}

export function PageTitle({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {desc && <p className="mt-1 text-sm text-gray-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition",
        active ? "border-ocean-600 bg-ocean-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-ocean-300",
      )}
    >
      {children}
    </Link>
  );
}
