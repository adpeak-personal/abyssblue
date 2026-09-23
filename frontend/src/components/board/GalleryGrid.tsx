import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import type { Post } from "@/types";
import { getUser } from "@/lib/data";
import { Tag, Thumb } from "@/components/ui";
import { formatPrice, formatRelative } from "@/lib/utils";

export function GalleryGrid({ items, cols = "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" }: { items: Post[]; cols?: string }) {
  return (
    <ul className={`grid gap-4 ${cols}`}>
      {items.map((p) => {
        const author = getUser(p.authorId);
        const isMarket = p.boardSlug === "market";
        return (
          <li key={p.id}>
            <Link href={`/board/${p.boardSlug}/${p.id}`} className="group block">
              <div className="relative">
                <Thumb gradient={p.thumbColor} className="aspect-square rounded-lg transition group-hover:brightness-110" label={p.category} />
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
                <span className="truncate">{author.nickname}</span>
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
