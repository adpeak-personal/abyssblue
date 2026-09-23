import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, CornerDownRight, Siren } from "lucide-react";
import { getBoard, getComments, getPost, getPosts, getUser } from "@/lib/data";
import { Avatar, LevelBadge, Tag, Thumb } from "@/components/ui";
import { formatNumber, formatPrice, formatRelative } from "@/lib/utils";

export default async function PostPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const post = getPost(Number(id));
  const board = getBoard(slug);
  if (!post || !board) notFound();

  const author = getUser(post.authorId);
  const comments = getComments(post.id);
  const related = getPosts({ boardSlug: slug, size: 6 }).items.filter((p) => p.id !== post.id).slice(0, 5);

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
            <button className="rounded-full p-2 text-gray-400 hover:bg-gray-100" aria-label="더보기"><MoreHorizontal size={18} /></button>
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
          {(post.hasImage || post.thumbColor) && <Thumb gradient={post.thumbColor ?? "lagoon"} className="mb-5 aspect-video w-full rounded-lg" />}
          <div className="whitespace-pre-line text-[15px] leading-7 text-gray-800">
            {post.content || "본문 내용이 들어갈 자리입니다. (더미 데이터)"}
          </div>

          <div className="mt-10 flex items-center justify-center gap-2">
            <button className="flex items-center gap-1.5 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-coral-400 hover:text-coral-500">
              <Heart size={17} /> 좋아요 {post.likes}
            </button>
            <button className="rounded-full border border-gray-200 p-2.5 text-gray-500 hover:bg-gray-50" aria-label="스크랩"><Bookmark size={17} /></button>
            <button className="rounded-full border border-gray-200 p-2.5 text-gray-500 hover:bg-gray-50" aria-label="공유"><Share2 size={17} /></button>
          </div>
        </div>

        {/* 댓글 */}
        <section className="border-t border-gray-100 px-5 py-5 sm:px-8">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <MessageCircle size={16} /> 댓글 {post.commentCount}
          </h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {comments.map((c) => {
              const u = getUser(c.authorId);
              return (
                <li key={c.id} className={`flex gap-3 py-3.5 ${c.parentId ? "pl-8" : ""}`}>
                  {c.parentId && <CornerDownRight size={14} className="-ml-5 mt-1 shrink-0 text-gray-300" />}
                  <Avatar user={u} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                      {u.nickname}
                      {u.id === author.id && <Tag tone="ocean">작성자</Tag>}
                      <LevelBadge level={u.level} />
                    </p>
                    <p className="mt-1 text-sm text-gray-700">{c.content}</p>
                    <p className="mt-1 flex gap-3 text-xs text-gray-400">
                      <span>{formatRelative(c.createdAt)}</span>
                      <button className="hover:text-gray-600">답글쓰기</button>
                      <span className="flex items-center gap-0.5"><Heart size={11} /> {c.likes}</span>
                    </p>
                  </div>
                </li>
              );
            })}
            {comments.length === 0 && <li className="py-8 text-center text-sm text-gray-400">첫 댓글을 남겨보세요 🐠</li>}
          </ul>
          <form className="mt-3 rounded-lg border border-gray-200 p-3 focus-within:border-ocean-400">
            <p className="text-xs font-semibold text-gray-700">댓글 쓰기</p>
            <textarea rows={3} placeholder="댓글을 남겨보세요. 안전과 배려를 지켜주세요." className="mt-1 w-full resize-none text-sm outline-none" />
            <div className="flex justify-end">
              <button type="button" className="rounded-md bg-ocean-600 px-4 py-1.5 text-sm font-semibold text-white">등록</button>
            </div>
          </form>
        </section>
      </article>

      <div className="flex items-center justify-between">
        <Link href={`/board/${slug}`} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">목록</Link>
        <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500"><Siren size={13} /> 신고</button>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-bold text-gray-900">&apos;{board.name}&apos; 게시판 다른 글</h2>
        <ul className="py-1">
          {related.map((p) => (
            <li key={p.id}>
              <Link href={`/board/${slug}/${p.id}`} className="flex items-center gap-2 px-5 py-2 text-sm hover:bg-gray-50">
                <span className="line-clamp-1 text-gray-700">{p.title}</span>
                {p.commentCount > 0 && <span className="shrink-0 text-xs text-coral-500">[{p.commentCount}]</span>}
                <span className="ml-auto shrink-0 text-xs text-gray-400">{formatRelative(p.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
