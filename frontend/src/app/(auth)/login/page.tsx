import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/layout/Logo";
import { getSessionUser } from "@/lib/session";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "로그인" };

export default async function LoginPage() {
  // 이미 로그인했으면 굳이 로그인 화면을 보여주지 않는다
  if (await getSessionUser()) redirect("/");

  return (
    <div className="rounded-2xl bg-white p-8 shadow-2xl">
      <div className="flex flex-col items-center">
        <BrandLogo className="h-11" />
        <h1 className="mt-3 text-2xl font-extrabold text-ocean-900">로그인</h1>
        <p className="mt-1 text-sm text-gray-500">어비스 블루에 다시 오신 걸 환영해요</p>
      </div>

      {/* useSearchParams 를 쓰므로 Suspense 가 필요하다 */}
      <Suspense fallback={<div className="mt-7 h-48 animate-pulse rounded-lg bg-gray-50" />}>
        <LoginForm />
      </Suspense>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" /> 간편 로그인 <span className="h-px flex-1 bg-gray-200" />
      </div>
      <SocialButtons />

      <p className="mt-6 text-center text-sm text-gray-500">
        아직 회원이 아니신가요?{" "}
        <Link href="/signup" className="font-semibold text-ocean-600 hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
