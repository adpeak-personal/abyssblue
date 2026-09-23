import Link from "next/link";
import { BrandLogo } from "@/components/layout/Logo";

export const metadata = { title: "회원가입" };

const inputCls = "w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100";
const AGENCIES = ["PADI", "SSI", "NAUI", "CMAS", "SDI", "KUDA", "기타"];
const LEVELS = ["자격증 없음 (체험 다이빙)", "Open Water", "Advanced Open Water", "Rescue Diver", "Master Diver", "Divemaster", "Instructor 이상"];

function Step({ n, title }: { n: number; title: string }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ocean-600 text-[11px] text-white">{n}</span>
      {title}
    </p>
  );
}

export default function SignupPage() {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-2xl">
      <div className="flex flex-col items-center">
        <BrandLogo className="h-10" />
        <h1 className="mt-3 text-2xl font-extrabold text-ocean-900">회원가입</h1>
        <p className="mt-1 text-sm text-gray-500">48,213명의 다이버가 함께하고 있어요 🐠</p>
      </div>

      <form className="mt-7 space-y-6">
        <section>
          <Step n={1} title="계정 정보" />
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <input type="email" placeholder="이메일" autoComplete="email" className={inputCls} />
              <button type="button" className="shrink-0 rounded-lg border border-gray-200 px-3 text-sm text-gray-600">인증</button>
            </div>
            <input type="password" placeholder="비밀번호 (8자 이상, 영문+숫자)" autoComplete="new-password" className={inputCls} />
            <input type="password" placeholder="비밀번호 확인" autoComplete="new-password" className={inputCls} />
            <div className="flex gap-2">
              <input placeholder="닉네임 (2~12자)" className={inputCls} />
              <button type="button" className="shrink-0 rounded-lg border border-gray-200 px-3 text-sm text-gray-600">중복확인</button>
            </div>
          </div>
        </section>

        <section>
          <Step n={2} title="다이버 정보" />
          <div className="grid grid-cols-2 gap-2.5">
            <select className={inputCls} defaultValue="">
              <option value="" disabled>자격 단체</option>
              {AGENCIES.map((a) => <option key={a}>{a}</option>)}
            </select>
            <select className={inputCls} defaultValue="">
              <option value="" disabled>자격 등급</option>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
            <input type="number" placeholder="총 다이빙 횟수" className={inputCls} />
            <select className={inputCls} defaultValue="">
              <option value="" disabled>활동 지역</option>
              {["서울", "경기", "강원", "부산/경남", "대구/경북", "제주", "해외"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">자격증 카드 사진을 올리면 &apos;인증 다이버&apos; 배지를 받을 수 있어요. (가입 후 마이페이지)</p>
        </section>

        <section className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
          <label className="flex items-center gap-2 font-semibold text-gray-800"><input type="checkbox" className="accent-ocean-600" /> 전체 동의</label>
          <hr className="border-gray-200" />
          {["[필수] 이용약관 동의", "[필수] 개인정보 수집 및 이용 동의", "[필수] 안전 다이빙 커뮤니티 수칙 동의", "[선택] 투어 · 이벤트 소식 수신"].map((t) => (
            <label key={t} className="flex items-center gap-2 text-gray-600"><input type="checkbox" className="accent-ocean-600" /> {t}</label>
          ))}
        </section>

        <button type="button" className="w-full rounded-lg bg-ocean-600 py-3 font-semibold text-white hover:bg-ocean-700">가입하고 입수하기 🤿</button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        이미 회원이신가요? <Link href="/login" className="font-semibold text-ocean-600 hover:underline">로그인</Link>
      </p>
    </div>
  );
}
