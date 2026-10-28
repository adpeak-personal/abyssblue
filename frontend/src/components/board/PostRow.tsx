import Link from "next/link";
import { Image as ImageIcon } from "lucide-react";
import type { Post } from "@/types";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * 홈·상세 페이지의 짧은 글 목록용 한 줄.
 *
 * 게시판 본목록(PostTable)보다 정보를 덜 보여주지만,
 * 행 높이와 "이미지 있음" 표시 방식은 본목록과 같게 맞춘다.
 */
export function PostRow({
  post: p,
  href,
  leading,
  category,
  date = true,
  className,
}: {
  post: Post;
  href: string;
  /** 순위 숫자, 확성기 아이콘처럼 제목 앞에 붙는 요소 */
  leading?: React.ReactNode;
  /** 말머리 표시 방식 — 기본은 [말머리], "tag" 면 색 뱃지 */
  category?: "plain" | "tag" | "none";
  date?: boolean;
  className?: string;
}) {
  const imageCount = p.imageCount ?? 0;
  return (
    <Link href={href} className={cn("flex items-center gap-2 px-5 py-2 text-sm hover:bg-gray-50", className)}>
      {leading}
      {category === "plain" && p.category && <span className="shrink-0 text-xs text-ocean-600">[{p.category}]</span>}
      <span className="line-clamp-1 text-gray-800">{p.title}</span>
      {p.commentCount > 0 && <span className="shrink-0 text-xs font-bold text-coral-500">[{p.commentCount}]</span>}

      {/* 본목록과 같은 위치·같은 아이콘 */}
      {p.hasImage && (
        <span className="ml-auto flex shrink-0 items-center gap-0.5 text-gray-400">
          <ImageIcon size={13} />
          {imageCount > 1 && <span className="text-[11px]">{imageCount}</span>}
        </span>
      )}

      {date && (
        <span className={cn("shrink-0 text-xs text-gray-400", !p.hasImage && "ml-auto", p.hasImage && "pl-2")}>
          {formatRelative(p.createdAt)}
        </span>
      )}
    </Link>
  );
}
