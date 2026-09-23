import { CAFE_INFO } from "@/data/mock";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-xs leading-6 text-gray-400">
        <p className="font-semibold text-gray-600">{CAFE_INFO.name} · {CAFE_INFO.slogan}</p>
        <p>이용약관 · 개인정보처리방침 · 운영정책 · 제휴문의</p>
        <p>안전한 다이빙을 위해 항상 버디와 함께, 본인의 자격 수준 내에서 다이빙하세요.</p>
        <p>© 2026 {CAFE_INFO.name}. 디자인 시안 — 모든 데이터는 더미입니다.</p>
      </div>
    </footer>
  );
}
