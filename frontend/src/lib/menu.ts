import {
  Home,
  List,
  Megaphone,
  Hand,
  MessagesSquare,
  NotebookPen,
  Camera,
  CircleHelp,
  Wrench,
  ShoppingBag,
  Users,
  ShieldAlert,
  MapPinned,
  BookOpen,
  CirclePlus,
  CalendarDays,
  UserRound,
  PenSquare,
  type LucideIcon,
} from "lucide-react";
import { boardGroups } from "@/data/mock";

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface MenuGroup {
  name: string;
  items: MenuItem[];
}

/** 항상 첫 번째에 고정되는 메뉴 */
export const HOME_MENU_ID = "home";
export const DEFAULT_FAVORITES = [HOME_MENU_ID];
/** 홈(고정)을 제외하고 추가할 수 있는 최대 개수 */
export const MAX_FAVORITES = 5;

const BOARD_ICONS: Record<string, LucideIcon> = {
  notice: Megaphone,
  greeting: Hand,
  free: MessagesSquare,
  review: NotebookPen,
  photo: Camera,
  qna: CircleHelp,
  gear: Wrench,
  market: ShoppingBag,
  buddy: Users,
  safety: ShieldAlert,
};

/** 자주 쓰는 메뉴에 추가할 수 있는 전체 목록 */
export const MENU_CATALOG: MenuGroup[] = [
  {
    name: "기본",
    items: [
      { id: HOME_MENU_ID, label: "홈", href: "/", icon: Home },
      { id: "all", label: "전체글보기", href: "/board/all", icon: List },
      { id: "write", label: "글쓰기", href: "/write", icon: PenSquare },
      { id: "mypage", label: "마이페이지", href: "/mypage", icon: UserRound },
    ],
  },
  {
    name: "다이버 도구",
    items: [
      { id: "points", label: "다이빙 포인트", href: "/points", icon: MapPinned },
      { id: "logbook", label: "로그북", href: "/logbook", icon: BookOpen },
      { id: "log-new", label: "새 로그 기록", href: "/logbook/new", icon: CirclePlus },
      { id: "tours", label: "투어 · 모집", href: "/tours", icon: CalendarDays },
    ],
  },
  ...boardGroups.map((g) => ({
    name: g.name.replace(/^\p{Extended_Pictographic}\s*/u, ""),
    items: g.boards.map((b) => ({ id: `board:${b.slug}`, label: b.name, href: `/board/${b.slug}`, icon: BOARD_ICONS[b.slug] ?? List })),
  })),
];

const MENU_BY_ID = new Map(MENU_CATALOG.flatMap((g) => g.items).map((i) => [i.id, i]));

export function getMenuItems(ids: string[]) {
  return ids.map((id) => MENU_BY_ID.get(id)).filter((i): i is MenuItem => Boolean(i));
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
