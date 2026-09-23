import Link from "next/link";
import { Image as ImageIcon, Heart } from "lucide-react";
import type { Post } from "@/types";
import { getBoard, getUser } from "@/lib/data";
import { Avatar, LevelBadge, Tag } from "@/components/ui";
import { formatNumber, formatRelative } from "@/lib/utils";

export function PostTable({ items, notices = [], showBoard = false }: { items: Post[]; notices?: Post[]; showBoard?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* 데스크톱 테이블 */}
      <table className="hidden w-full text-sm md:table">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="w-16 py-2.5 font-medium">번호</th>
            <th className="py-2.5 text-left font-medium">제목</th>
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
          const author = getUser(p.authorId);
          return (
            <li key={`m-${p.id}`} className={p.isNotice ? "bg-ocean-50/50" : ""}>
              <Link href={`/board/${p.boardSlug}/${p.id}`} className="block px-4 py-3">
                <p className="line-clamp-1 text-[15px] text-gray-900">
                  {p.isNotice && <Tag tone="ocean">공지</Tag>} {p.category && !p.isNotice && <span className="text-ocean-600">[{p.category}]</span>} {p.title}
                  {p.commentCount > 0 && <span className="ml-1 text-xs font-bold text-coral-500">[{p.commentCount}]</span>}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {author.nickname} · {formatRelative(p.createdAt)} · 조회 {formatNumber(p.views)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {items.length === 0 && notices.length === 0 && <p className="py-16 text-center text-sm text-gray-400">등록된 게시글이 없습니다.</p>}
    </div>
  );
}

function Row({ post: p, notice, showBoard }: { post: Post; notice?: boolean; showBoard?: boolean }) {
  const author = getUser(p.authorId);
  const board = getBoard(p.boardSlug);
  return (
    <tr className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${notice ? "bg-ocean-50/40" : ""}`}>
      <td className="py-2.5 text-center text-xs text-gray-400">{notice ? <Tag tone="ocean">공지</Tag> : p.id}</td>
      <td className="py-2.5 pr-3">
        <Link href={`/board/${p.boardSlug}/${p.id}`} className="group flex items-center gap-1.5">
          {showBoard && board && <span className="shrink-0 text-xs text-gray-400">{board.name}</span>}
          {p.category && !notice && <span className="shrink-0 text-ocean-600">[{p.category}]</span>}
          <span className={`line-clamp-1 group-hover:underline ${notice ? "font-semibold text-gray-900" : "text-gray-800"}`}>{p.title}</span>
          {p.hasImage && <ImageIcon size={14} className="shrink-0 text-gray-400" />}
          {p.commentCount > 0 && <span className="shrink-0 text-xs font-bold text-coral-500">[{p.commentCount}]</span>}
        </Link>
      </td>
      <td className="py-2.5">
        <span className="flex items-center gap-1.5">
          <Avatar user={author} size={20} />
          <span className="truncate text-gray-700">{author.nickname}</span>
          <LevelBadge level={author.level} className="hidden xl:inline-flex" />
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
