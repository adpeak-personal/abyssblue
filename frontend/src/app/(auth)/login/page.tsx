import Link from "next/link";
import { BrandLogo } from "@/components/layout/Logo";

export const metadata = { title: "로그인" };

const inputCls = "w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100";

export default function LoginPage() {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-2xl">
      <div className="flex flex-col items-center">
        <BrandLogo className="h-11" />
        <h1 className="mt-3 text-2xl font-extrabold text-ocean-900">로그인</h1>
        <p className="mt-1 text-sm text-gray-500">어비스 블루에 다시 오신 걸 환영해요</p>
      </div>

      <form className="mt-7 space-y-3">
        <input type="email" name="email" placeholder="이메일" autoComplete="email" className={inputCls} />
        <input type="password" name="password" placeholder="비밀번호" autoComplete="current-password" className={inputCls} />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600"><input type="checkbox" className="accent-ocean-600" /> 로그인 유지</label>
          <Link href="#" className="text-gray-400 hover:text-ocean-600">비밀번호 찾기</Link>
        </div>
        <button type="button" className="w-full rounded-lg bg-ocean-600 py-3 font-semibold text-white hover:bg-ocean-700">로그인</button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" /> 간편 로그인 <span className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="space-y-2">
        <button type="button" className="w-full rounded-lg bg-[#FEE500] py-3 text-sm font-semibold text-[#191919]">카카오로 시작하기</button>
        <button type="button" className="w-full rounded-lg bg-[#03C75A] py-3 text-sm font-semibold text-white">네이버로 시작하기</button>
        <button type="button" className="w-full rounded-lg border border-gray-200 py-3 text-sm font-semibold text-gray-700">Google로 시작하기</button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        아직 회원이 아니신가요? <Link href="/signup" className="font-semibold text-ocean-600 hover:underline">회원가입</Link>
      </p>
    </div>
  );
}
