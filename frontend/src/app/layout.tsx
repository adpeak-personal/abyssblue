import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "어비스 블루 · 다이버 커뮤니티", template: "%s | 어비스 블루" },
  description: "다이빙 포인트, 로그북, 투어 모집까지 — 깊고 푸른 바다를 사랑하는 다이버 커뮤니티",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      {/* 헤더/푸터는 각 레이아웃이 책임진다 — 어드민은 자체 헤더를 쓴다 */}
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
