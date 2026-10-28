import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/layout/Logo";
import { getSessionUser } from "@/lib/session";
import { ResetForm } from "./ResetForm";

export const metadata = { title: "비밀번호 찾기" };

export default async function ForgotPage() {
  // 이미 로그인한 사람은 비밀번호를 찾을 일이 없다
  if (await getSessionUser()) redirect("/");

  return (
    <div className="rounded-2xl bg-white p-8 shadow-2xl">
      <div className="flex flex-col items-center">
        <BrandLogo className="h-11" />
        <h1 className="mt-3 text-2xl font-extrabold text-ocean-900">비밀번호 찾기</h1>
        <p className="mt-1 text-sm text-gray-500">휴대폰 인증으로 새 비밀번호를 설정해요</p>
      </div>

      <ResetForm />

      <p className="mt-6 text-center text-sm text-gray-500">
        비밀번호가 기억나셨나요?{" "}
        <Link href="/login" className="font-semibold text-ocean-600 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
