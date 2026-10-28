import Link from "next/link";
import { notFound } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { apiGet, type WithAuthor } from "@/lib/api";
import type { Board, Comment, Post } from "@/types";
import { Avatar, LevelBadge, Tag } from "@/components/ui";
import { PostBody } from "@/components/board/PostBody";
import { PostRow } from "@/components/board/PostRow";
import { PostActions } from "@/components/board/PostActions";
import { CommentSection } from "@/components/board/CommentSection";
import { PostReactions } from "@/components/board/PostReactions";
import { ReportButton } from "@/components/board/ReportButton";
import { authHeaders, getSessionUser, isAdmin } from "@/lib/session";
import { formatNumber, formatPrice, formatRelative } from "@/lib/utils";

export default async function PostPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const board = await apiGet<Board>(`/boards/${slug}`);
  // 본문·댓글은 API 에서 읽는다 (방금 쓴 글이 바로 보여야 하므로)
  // 쿠키를 실어 보내야 "내가 누른 좋아요·스크랩" 이 함께 내려온다
  const post = await apiGet<
    WithAuthor<Post> & {
      comments: (WithAuthor<Comment> & { liked?: boolean })[];
      liked: boolean;
      scrapped: boolean;
    }
  >(`/posts/${id}`, await authHeaders());
  if (!post || !board) notFound();

  const author = post.author;
  const comments = post.comments;

  // 수정·삭제는 본인과 운영진만 — 서버도 다시 확인한다
  const me = await getSessionUser();
  const canEdit = Boolean(me) && (me!.id === author.id || isAdmin(me));
  // 같은 게시판 다른 글 — 지금 보는 글은 빼고 5개
  const relatedList = await apiGet<{ items: Post[] }>(`/boards/${slug}/posts?size=6`);
  const related = (relatedList?.items ?? []).filter((p) => p.id !== post.id).slice(0, 5);

  return (
    <div className="space-y-4">
      <article className="rounded-xl border border-gray-200 bg-white">
        <header className="border-b border-gray-100 px-5 py-5 sm:px-8">
          <Link href={`/board/${slug}`} className="text-sm font-medium text-ocean-600 hover:underline">{board.name} &gt;</Link>
          <h1 className="mt-2 text-xl font-bold leading-snug text-gray-900 sm:text-2xl">
            {post.category && <span className="mr-1 text-ocean-600">[{post.category}]</span>}
            {post.title}
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <Avatar user={author} size={40} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                {author.nickname} <LevelBadge level={author.level} />
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {author.certAgency} {author.certLevel} · {formatRelative(post.createdAt)} · 조회 {formatNumber(post.views)}
              </p>
            </div>
            {canEdit ? (
              <PostActions slug={slug} postId={post.id} />
            ) : (
              <button className="rounded-full p-2 text-gray-400 hover:bg-gray-100" aria-label="더보기"><MoreHorizontal size={18} /></button>
            )}
          </div>
        </header>

        <div className="px-5 py-6 sm:px-8">
          {post.price !== undefined && (
            <div className="mb-5 flex items-center gap-3 rounded-lg bg-gray-50 p-4">
              <span className="text-2xl font-extrabold text-gray-900">{formatPrice(post.price)}</span>
              <Tag tone={post.tradeStatus === "판매중" ? "ocean" : "gray"}>{post.tradeStatus}</Tag>
              <button className="ml-auto rounded-lg bg-ocean-600 px-4 py-2 text-sm font-semibold text-white">1:1 채팅</button>
            </div>
          )}
          {/*
            예전에는 hasImage 면 여기에 그라디언트 상자를 깔았다 — 실제 이미지가 없던
            시절의 자리 표시였다. 지금은 본문에 진짜 이미지가 들어 있어서,
            글마다 의미 없는 파란 상자가 하나씩 더 붙는 꼴이었다.
          */}
          <PostBody post={post} />

          <PostReactions
            postId={post.id}
            initialLikes={post.likes}
            initialLiked={post.liked}
            initialScrapped={post.scrapped}
            loggedIn={Boolean(me)}
          />
        </div>

        {/* 댓글 — 작성·답글·수정·삭제가 다 여기서 일어난다 */}
        <CommentSection postId={post.id} postAuthorId={author.id} initial={comments} me={me} />
      </article>

      <div className="flex items-center justify-between">
        <Link href={`/board/${slug}`} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">목록</Link>
        {/* 본인 글은 신고할 수 없다 — 서버도 막지만 버튼을 띄울 이유가 없다 */}
        {me?.id !== author.id && (
          <ReportButton targetType="post" targetId={post.id} loggedIn={Boolean(me)} />
        )}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-bold text-gray-900">&apos;{board.name}&apos; 게시판 다른 글</h2>
        <ul className="py-1">
          {related.map((p) => (
            <li key={p.id}>
              <PostRow post={p} href={`/board/${slug}/${p.id}`} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
