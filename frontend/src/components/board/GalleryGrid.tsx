import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import type { ListPost } from "@/types";
import { Tag, Thumb, UNKNOWN_AUTHOR } from "@/components/ui";
import { formatPrice, formatRelative } from "@/lib/utils";

export function GalleryGrid({ items, cols = "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" }: { items: ListPost[]; cols?: string }) {
  return (
    <ul className={`grid gap-4 ${cols}`}>
      {items.map((p) => {
        const author = p.author;
        const isMarket = p.boardSlug === "market";
        return (
          <li key={p.id}>
            <Link href={`/board/${p.boardSlug}/${p.id}`} className="group block">
              <div className="relative">
                {p.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- /uploads 는 rewrite 경로라 next/image 미적용
                  <img src={p.thumbnailUrl} alt="" loading="lazy" decoding="async" className="aspect-square w-full rounded-lg object-cover transition group-hover:brightness-110" />
                ) : (
                  <Thumb gradient={p.thumbColor} className="aspect-square rounded-lg transition group-hover:brightness-110" label={p.category} />
                )}
                {p.tradeStatus && p.tradeStatus !== "판매중" && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 text-sm font-bold text-white">{p.tradeStatus}</div>
                )}
              </div>
              <p className="mt-2 line-clamp-1 text-sm font-medium text-gray-900 group-hover:underline">{p.title}</p>
              {isMarket ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-[15px] font-bold text-gray-900">
                  {formatPrice(p.price ?? 0)}
                  {p.tradeStatus === "예약중" && <Tag tone="green">예약중</Tag>}
                </p>
              ) : null}
              <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                <span className="truncate">{author?.nickname ?? UNKNOWN_AUTHOR.nickname}</span>
                <span>{formatRelative(p.createdAt)}</span>
                <span className="ml-auto flex items-center gap-0.5"><Heart size={11} />{p.likes}</span>
                <span className="flex items-center gap-0.5"><MessageCircle size={11} />{p.commentCount}</span>
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
