import { notFound, redirect } from "next/navigation";
import { ApiError, apiGet } from "@/lib/api";
import { authHeaders, getSessionUser } from "@/lib/session";
import { PageTitle } from "@/components/ui";
import { PostForm } from "@/app/(cafe)/write/PostForm";
import { PhotoForm } from "@/app/(cafe)/write/PhotoForm";
import type { EditTarget } from "@/app/(cafe)/write/types";
import type { BoardGroup } from "@/types";

export const metadata = { title: "글 수정" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  const me = await getSessionUser();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/board/${slug}/${id}/edit`)}`);

  // 권한 판단은 서버가 한다. 남의 글이면 403 — 존재를 알려줄 필요가 없으니 404 로 덮는다
  const post = await apiGet<EditTarget>(`/posts/${id}/edit`, await authHeaders()).catch((err) => {
    if (err instanceof ApiError && err.status === 403) return null;
    throw err;
  });
  if (!post) notFound();

  const boardGroups = await apiGet<BoardGroup[]>("/boards");
  if (!boardGroups) notFound();

  const board = boardGroups.flatMap((g) => g.boards).find((b) => b.slug === post.boardSlug);
  if (!board) notFound();

  return (
    <div>
      <PageTitle title="글 수정" desc={`${board.name} 게시판`} />
      {/* 작성 때와 같은 폼을 쓴다 — 작성 방식은 글이 속한 게시판 설정을 따른다 */}
      {post.writeMode === "photo" ? (
        <PhotoForm boardGroups={boardGroups} board={board} editing={post} />
      ) : (
        <PostForm boardGroups={boardGroups} board={board} editing={post} />
      )}
    </div>
  );
}
