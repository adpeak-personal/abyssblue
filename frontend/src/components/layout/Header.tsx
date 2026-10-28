import Link from "next/link";
import { Search, PenSquare } from "lucide-react";
import { CAFE_INFO } from "@/data/mock";
import { apiGet } from "@/lib/api";
import { authHeaders, getCurrentProfile } from "@/lib/session";
import type { BoardGroup } from "@/types";
import { LogoutButton } from "./LogoutButton";
import { Avatar } from "@/components/ui";
import { BrandLogo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NotificationBell } from "./NotificationBell";
import { FavoriteMenuBar } from "./FavoriteMenuBar";

export async function Header() {
  // 새로 가입한 회원은 DB 에만 있으므로 API 에서 읽는다
  // 게시판 메뉴도 마찬가지 — 어드민에서 이름을 바꾸면 바로 반영돼야 한다
  const [me, boardGroups] = await Promise.all([
    getCurrentProfile(),
    apiGet<BoardGroup[]>("/boards"),
  ]);

  // 종 뱃지에 쓸 개수만 미리 센다 — 목록은 열 때 받아온다
  const unread = me
    ? await apiGet<{ unread: number }>("/me/notifications/unread", await authHeaders())
    : null;
  return (
    // 주의: header 에 backdrop-blur/filter/transform 을 넣으면 내부 fixed 드로어가 헤더 영역에 갇힘
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-4">
        <MobileMenu me={me} cafeName={CAFE_INFO.name} boardGroups={boardGroups ?? []} />

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
          {me ? (
            <>
              <Link href="/write" className="hidden items-center gap-1 rounded-full bg-ocean-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-ocean-700 sm:flex">
                <PenSquare size={15} /> 글쓰기
              </Link>
              <NotificationBell initialUnread={unread?.unread ?? 0} />
              <Link href="/mypage" className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100" aria-label="마이페이지">
                <Avatar user={me} size={30} />
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
                로그인
              </Link>
              <Link href="/signup" className="rounded-full bg-ocean-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-ocean-700">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>

      <FavoriteMenuBar />
    </header>
  );
}
