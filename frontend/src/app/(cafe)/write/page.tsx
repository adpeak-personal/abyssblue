import { notFound, redirect } from "next/navigation";
import { apiGet } from "@/lib/api";
import { getSessionUser, isAdmin } from "@/lib/session";
import { PageTitle } from "@/components/ui";
import { PostForm } from "./PostForm";
import { PhotoForm } from "./PhotoForm";
import type { BoardGroup } from "@/types";

export const metadata = { title: "글쓰기" };

export default async function WritePage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const { board: boardSlug = "free" } = await searchParams;

  // 글쓰기는 로그인 필수 — 서버도 막지만 화면에서 먼저 돌려보낸다
  const me = await getSessionUser();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/write?board=${boardSlug}`)}`);

  // 어드민에서 바꾼 게시판 구성·말머리가 바로 반영되도록 API 에서 읽는다
  const boardGroups = await apiGet<BoardGroup[]>("/boards");
  if (!boardGroups) notFound();

  const allBoards = boardGroups.flatMap((g) => g.boards);
  const board = allBoards.find((b) => b.slug === boardSlug) ?? allBoards.find((b) => b.slug === "free");
  if (!board) notFound();

  return (
    <div>
      <PageTitle
        title="글쓰기"
        desc={
          board.writeMode === "photo"
            ? "사진을 올리고 짧은 설명을 남겨주세요."
            : "서로 존중하는 글쓰기, 안전한 다이빙 문화를 함께 만들어요."
        }
      />
      {/* 게시판 설정(writeMode)에 따라 작성 화면이 갈린다 — 저장 포맷은 같다 */}
      {board.writeMode === "photo" ? (
        <PhotoForm boardGroups={boardGroups} board={board} />
      ) : (
        <PostForm boardGroups={boardGroups} board={board} canPostNotice={isAdmin(me)} />
      )}
    </div>
  );
}
