import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/layout/Logo";
import { getSessionUser } from "@/lib/session";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "회원가입" };

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/");

  return (
    <div className="rounded-2xl bg-white p-8 shadow-2xl">
      <div className="flex flex-col items-center">
        <BrandLogo className="h-11" />
        <h1 className="mt-3 text-2xl font-extrabold text-ocean-900">회원가입</h1>
        <p className="mt-1 text-sm text-gray-500">깊고 푸른 바다에서 만나요 🤿</p>
      </div>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-gray-500">
        이미 회원이신가요?{" "}
        <Link href="/login" className="font-semibold text-ocean-600 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
