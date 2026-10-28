import { Images } from "lucide-react";
import type { Post } from "@/types";
import { Thumb } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * 목록용 썸네일.
 *
 * 본문 첫 이미지(thumbnailUrl)가 있으면 그걸 쓰고, 없으면 기존 그라디언트로 대체한다.
 * 둘 다 없는 글은 아예 렌더하지 않아서(null) 목록에 빈 칸이 생기지 않게 한다.
 *
 * next/image 를 쓰지 않는 이유 — 업로드 이미지는 /uploads 로 rewrite 되는 로컬 경로라
 * Next 16 의 이미지 최적화가 private IP 를 막아 400 이 난다. 목록 썸네일은 작아서
 * 최적화 이득도 크지 않다.
 */
export function PostThumb({
  post,
  size,
  className,
  placeholder,
}: {
  post: Post;
  size: number;
  className?: string;
  /** 이미지가 없어도 같은 크기의 빈 자리를 남긴다 (목록 제목 정렬용) */
  placeholder?: boolean;
}) {
  const hasGradient = Boolean(post.thumbColor);
  if (!post.thumbnailUrl && !hasGradient) {
    return placeholder ? <span className="block shrink-0" style={{ width: size, height: size }} aria-hidden /> : null;
  }

  const extra = (post.imageCount ?? 0) - 1;

  return (
    <span
      className={cn("relative block shrink-0 overflow-hidden rounded-md bg-gray-100", className)}
      style={{ width: size, height: size }}
    >
      {post.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 위 주석 참고
        <img
          src={post.thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <Thumb gradient={post.thumbColor} className="h-full w-full" />
      )}

      {extra > 0 && (
        <span className="absolute bottom-0 right-0 flex items-center gap-0.5 rounded-tl bg-black/55 px-1 text-[10px] font-medium text-white">
          <Images size={9} />
          {extra + 1}
        </span>
      )}
    </span>
  );
}
