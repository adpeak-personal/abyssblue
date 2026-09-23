import Link from "next/link";
import { Bell, Search, PenSquare } from "lucide-react";
import { CAFE_INFO, boardGroups } from "@/data/mock";
import { getCurrentUser } from "@/lib/data";
import { Avatar } from "@/components/ui";
import { BrandLogo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { FavoriteMenuBar } from "./FavoriteMenuBar";

export function Header() {
  const me = getCurrentUser();
  return (
    // 주의: header 에 backdrop-blur/filter/transform 을 넣으면 내부 fixed 드로어가 헤더 영역에 갇힘
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-4">
        <MobileMenu me={me} cafeName={CAFE_INFO.name} boardGroups={boardGroups} />

        <Link href="/" className="flex items-center" aria-label={CAFE_INFO.name}>
          <BrandLogo className="h-7 sm:h-8" />
        </Link>

        <form action="/search" className="ml-4 hidden flex-1 md:block">
          <label className="flex max-w-md items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-500 focus-within:ring-2 focus-within:ring-ocean-300">
            <Search size={16} />
            <input name="q" placeholder="포인트, 게시글, 장비 검색" className="w-full bg-transparent text-gray-800 outline-none" />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <Link href="/search" className="rounded-full p-2 text-gray-600 hover:bg-gray-100 md:hidden" aria-label="검색">
            <Search size={19} />
          </Link>
          <Link href="/write" className="hidden items-center gap-1 rounded-full bg-ocean-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-ocean-700 sm:flex">
            <PenSquare size={15} /> 글쓰기
          </Link>
          <button className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100" aria-label="알림">
            <Bell size={19} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-coral-500" />
          </button>
          <Link href="/mypage" className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100" aria-label="마이페이지">
            <Avatar user={me} size={30} />
          </Link>
          <Link href="/login" className="hidden px-2 text-sm text-gray-500 hover:text-ocean-600 lg:block">
            로그인
          </Link>
        </div>
      </div>

      <FavoriteMenuBar />
    </header>
  );
}
