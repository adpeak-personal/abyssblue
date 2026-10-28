import Link from "next/link";
import { Image as ImageIcon, Heart } from "lucide-react";
import type { ListPost } from "@/types";
import { Avatar, LevelBadge, Tag, UNKNOWN_AUTHOR } from "@/components/ui";
import { PostThumb } from "./PostThumb";
import { formatNumber, formatRelative } from "@/lib/utils";

export function PostTable({
  items,
  notices = [],
  showBoard = false,
}: {
  items: ListPost[];
  notices?: ListPost[];
  showBoard?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* 데스크톱 테이블 */}
      <table className="hidden w-full text-sm md:table">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="py-2.5 pl-5 text-left font-medium">제목</th>
            <th className="w-40 py-2.5 text-left font-medium">작성자</th>
            <th className="w-20 py-2.5 font-medium">작성일</th>
            <th className="w-16 py-2.5 font-medium">조회</th>
            <th className="w-16 py-2.5 font-medium">좋아요</th>
          </tr>
        </thead>
        <tbody>
          {notices.map((p) => (
            <Row key={`n-${p.id}`} post={p} notice showBoard={showBoard} />
          ))}
          {items.map((p) => (
            <Row key={p.id} post={p} showBoard={showBoard} />
          ))}
        </tbody>
      </table>

      {/* 모바일 리스트 */}
      <ul className="divide-y divide-gray-100 md:hidden">
        {[...notices, ...items].map((p) => {
          const author = p.author;
          return (
            <li key={`m-${p.id}`} className={p.isNotice ? "bg-ocean-50/50" : ""}>
              {/* 모바일: 썸네일을 오른쪽 끝에 — 텍스트 읽는 흐름을 깨지 않는다 */}
              <Link href={`/board/${p.boardSlug}/${p.id}`} className="flex items-start gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-sm text-gray-900">
                    {p.isNotice && <Tag tone="ocean">공지</Tag>} {p.category && !p.isNotice && <span className="text-ocean-600">[{p.category}]</span>} {p.title}
                    {p.commentCount > 0 && <span className="ml-1 text-[11px] font-bold text-coral-500">[{p.commentCount}]</span>}
                  </span>
                  <span className="mt-1 block text-[11px] text-gray-400">
                    {author?.nickname ?? UNKNOWN_AUTHOR.nickname} · {formatRelative(p.createdAt)} · 조회 {formatNumber(p.views)}
                  </span>
                </span>
                {/* 모바일은 맞출 열이 없으니 자리를 비우지 않는다 — 사진 없는 글은 텍스트가 전체 폭 사용 */}
                <PostThumb post={p} size={60} />
              </Link>
            </li>
          );
        })}
      </ul>

      {items.length === 0 && notices.length === 0 && <p className="py-16 text-center text-sm text-gray-400">등록된 게시글이 없습니다.</p>}
    </div>
  );
}

function Row({ post: p, notice, showBoard }: { post: ListPost; notice?: boolean; showBoard?: boolean }) {
  const author = p.author;
  return (
    <tr className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${notice ? "bg-ocean-50/40" : ""}`}>
      <td className="py-2.5 pl-5 pr-3">
        <Link href={`/board/${p.boardSlug}/${p.id}`} className="group flex items-center gap-2">
          {/* 공지 뱃지와 말머리가 같은 폭을 쓴다 — 공지 줄과 일반 줄의 제목 시작점이 맞는다 */}
          <span className="flex w-[76px] shrink-0 items-center">
            {notice ? (
              <Tag tone="ocean">공지</Tag>
            ) : (
              <span className="truncate text-xs text-ocean-600">[{p.category ?? "일반"}]</span>
            )}
          </span>
          {/* 전체글보기의 게시판 이름도 폭을 고정한다 — 이름 길이가 제각각이라 안 그러면 제목이 밀린다 */}
          {showBoard && p.boardName && (
            <span className="w-[88px] shrink-0 truncate text-xs text-gray-400">{p.boardName}</span>
          )}
          <span className={`line-clamp-1 group-hover:underline ${notice ? "font-semibold text-gray-900" : "text-gray-800"}`}>{p.title}</span>
          {p.commentCount > 0 && <span className="shrink-0 text-xs font-bold text-coral-500">[{p.commentCount}]</span>}
          {/* 이미지 유무만 표시 — 장수는 목록에서 굳이 필요 없다 */}
          {p.hasImage && <ImageIcon size={14} className="ml-auto shrink-0 text-gray-400" />}
        </Link>
      </td>
      <td className="py-2.5">
        <span className="flex items-center gap-1.5 text-xs">
          <Avatar user={author} size={20} />
          <span className="truncate text-gray-600">{author?.nickname ?? UNKNOWN_AUTHOR.nickname}</span>
          <LevelBadge level={author?.level} className="hidden xl:inline-flex" />
        </span>
      </td>
      <td className="py-2.5 text-center text-xs text-gray-500">{formatRelative(p.createdAt)}</td>
      <td className="py-2.5 text-center text-xs text-gray-500">{formatNumber(p.views)}</td>
      <td className="py-2.5 text-center text-xs text-gray-500">
        <span className="inline-flex items-center gap-0.5"><Heart size={11} />{p.likes}</span>
      </td>
    </tr>
  );
}
