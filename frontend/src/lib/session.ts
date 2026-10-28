import "server-only";
import { cookies } from "next/headers";
import { apiUrl } from "./api";
import type { MemberLevel, User } from "@/types";

export const AUTH_COOKIE = "abyss_token";
/** 소셜 가입 중간 단계 토큰 — 추가 정보 화면에서만 쓴다 */
export const SOCIAL_COOKIE = "abyss_social";

export interface SessionUser {
  id: number;
  nickname: string;
  level: MemberLevel;
}

/**
 * 서버 컴포넌트에서 현재 로그인 사용자를 읽는다.
 *
 * 브라우저 → Next 는 쿠키가 자동으로 붙지만, Next → 백엔드(5030)는 별개 요청이라
 * 쿠키를 직접 실어 보내야 한다.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;

  try {
    const res = await fetch(apiUrl("/auth/me"), {
      headers: { cookie: `${AUTH_COOKIE}=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { user: SessionUser };
    return body.user;
  } catch {
    // 백엔드가 꺼져 있어도 화면은 떠야 한다 — 비로그인으로 취급
    return null;
  }
}

/**
 * 서버 컴포넌트에서 백엔드로 보낼 때 쓸 쿠키 헤더.
 *
 * 브라우저 → Next 는 자동으로 붙지만 Next → 백엔드는 별개 요청이라 직접 실어야 한다.
 * 필요한 쿠키만 골라 보낸다 — 관계없는 쿠키까지 넘길 이유가 없다.
 */
export async function authHeaders(
  names: string[] = [AUTH_COOKIE],
): Promise<Record<string, string>> {
  const jar = await cookies();
  const pairs = names
    .map((name) => [name, jar.get(name)?.value] as const)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, value]) => `${name}=${value}`);

  return pairs.length ? { cookie: pairs.join("; ") } : {};
}

export const isAdmin = (user: SessionUser | null) => user?.level === "운영진";

export type Profile = Omit<User, "email">;

/**
 * 로그인한 사람의 전체 프로필 — 아바타 색·자격증 등 표시용 정보까지.
 *
 * mock 에서 찾으면 안 된다. 새로 가입한 회원은 DB 에만 있어서 mock 조회가 터진다.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const session = await getSessionUser();
  if (!session) return null;

  try {
    const res = await fetch(apiUrl(`/users/${session.id}`), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Profile;
  } catch {
    return null;
  }
}

export interface DiveStats {
  totalDives: number;
  maxDepth: number;
  totalBottomTime: number;
  avgWaterTemp: number;
  pointsVisited: number;
}

export const EMPTY_STATS: DiveStats = {
  totalDives: 0,
  maxDepth: 0,
  totalBottomTime: 0,
  avgWaterTemp: 0,
  pointsVisited: 0,
};

/** 다이브 로그 통계 — DB 에서 집계한다 */
export async function getDiveStats(userId: number): Promise<DiveStats> {
  try {
    const res = await fetch(apiUrl(`/logs/stats?userId=${userId}`), { cache: "no-store" });
    if (!res.ok) return EMPTY_STATS;
    return (await res.json()) as DiveStats;
  } catch {
    return EMPTY_STATS;
  }
}
