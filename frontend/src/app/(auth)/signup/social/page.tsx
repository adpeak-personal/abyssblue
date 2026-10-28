import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/layout/Logo";
import { apiGet } from "@/lib/api";
import { SOCIAL_COOKIE, authHeaders, getSessionUser } from "@/lib/session";
import { SocialSignupForm } from "./SocialSignupForm";

export const metadata = { title: "간편 가입" };

const LABELS: Record<string, string> = { kakao: "카카오", naver: "네이버" };

export default async function SocialSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; nickname?: string }>;
}) {
  if (await getSessionUser()) redirect("/");

  // 소셜 인증을 실제로 거쳤는지는 쿠키로 확인한다 — 주소만 치고 들어오면 돌려보낸다
  const session = await apiGet<{ provider: string; email: string | null }>(
    "/auth/signup/social",
    await authHeaders([SOCIAL_COOKIE]),
  ).catch(() => null);
  if (!session) redirect("/login?social=invalid");

  const { email, nickname } = await searchParams;

  return (
    <div className="rounded-2xl bg-white p-8 shadow-2xl">
      <div className="flex flex-col items-center">
        <BrandLogo className="h-11" />
        <h1 className="mt-3 text-2xl font-extrabold text-ocean-900">조금만 더요</h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          {LABELS[session.provider] ?? session.provider} 계정을 확인했어요.
          <br />
          커뮤니티에서 쓸 정보만 받을게요.
        </p>
      </div>

      <SocialSignupForm
        defaultEmail={session.email ?? email ?? ""}
        defaultNickname={nickname ?? ""}
      />

      <p className="mt-6 text-center text-sm text-gray-500">
        다른 방법으로 가입할까요?{" "}
        <Link href="/signup" className="font-semibold text-ocean-600 hover:underline">
          이메일 회원가입
        </Link>
      </p>
    </div>
  );
}
