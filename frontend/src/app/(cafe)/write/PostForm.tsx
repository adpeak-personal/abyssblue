"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { RichEditor } from "@/components/editor";
import { BoardSelect } from "./BoardSelect";
import { DraftBanner } from "./DraftBanner";
import { clearDraft, sinceLabel, useAutoDraft, usePendingDraft } from "./useDraft";
import { ApiError, apiFetch, uploadImageFor } from "@/lib/api";
import type { EditTarget } from "./types";
import type { Board, BoardGroup } from "@/types";

/** 임시저장에 담는 내용 — 게시판은 키에 들어가므로 따로 담지 않는다 */
interface Draft {
  category: string;
  title: string;
  doc: JSONContent;
}

const PLACEHOLDER =
  "내용을 입력하세요.\n\n· 다이빙 후기는 포인트명, 날짜, 수온/시야를 함께 적어주시면 좋아요.\n· 사고사례는 개인 비난 없이 원인과 교훈 중심으로 작성해주세요.";

export function PostForm({
  boardGroups,
  board,
  editing,
  canPostNotice = false,
}: {
  boardGroups: BoardGroup[];
  board: Board;
  /** 넘어오면 수정 모드 — 같은 폼을 쓰고 전송만 PATCH 로 바뀐다 */
  editing?: EditTarget;
  /** 운영진만 공지로 올릴 수 있다. 서버도 등급을 다시 확인한다 */
  canPostNotice?: boolean;
}) {
  const router = useRouter();

  const [boardSlug, setBoardSlug] = useState(editing?.boardSlug ?? board.slug);
  const [category, setCategory] = useState(editing?.category ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [content, setContent] = useState<{ doc: JSONContent; empty: boolean }>(() => {
    const doc = editing?.contentJson ?? { type: "doc", content: [] };
    // 수정일 때는 아직 onChange 가 안 울렸어도 비어 있지 않다
    return { doc, empty: !editing?.contentJson };
  });
  const [isNotice, setIsNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 수정과 새 글의 임시저장은 서로 다른 칸에 담는다
  const draftKey = editing ? `post:edit:${editing.id}` : `post:new:${boardSlug}`;
  const { pending, decided, settle } = usePendingDraft<Draft>(draftKey);
  // 에디터에 내용을 넣으려면 다시 그려야 한다 (defaultValue 는 처음 한 번만 읽힌다)
  const [editorKey, setEditorKey] = useState(0);

  const { savedAt, saveNow } = useAutoDraft<Draft>(
    draftKey,
    { category, title, doc: content.doc },
    // 아무것도 안 쓴 상태를 저장해 둘 이유는 없다
    decided && (title.trim().length > 0 || !content.empty),
  );

  const restore = () => {
    if (!pending) return;
    setCategory(pending.data.category);
    setTitle(pending.data.title);
    setContent({ doc: pending.data.doc, empty: false });
    setEditorKey((k) => k + 1);
    settle();
  };

  const discard = () => {
    clearDraft(draftKey);
    settle();
  };

  // 직접 누른 임시저장은 지금 화면을 덮어쓰겠다는 뜻이다 — 복구 안내도 같이 치운다
  const saveManually = () => {
    settle();
    saveNow();
  };

  const allBoards = boardGroups.flatMap((g) => g.boards);
  const currentBoard = allBoards.find((b) => b.slug === boardSlug) ?? board;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("제목을 입력해 주세요.");
    if (content.empty) return setError("내용을 입력해 주세요.");

    setSubmitting(true);
    try {
      const post = editing
        ? await apiFetch<{ id: number }>(`/posts/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              // 수정에서는 게시판을 바꾸지 않는다 — 말머리를 지우면 null 로 보낸다
              category: category || null,
              title: title.trim(),
              contentJson: content.doc,
            }),
          })
        : await apiFetch<{ id: number }>("/posts", {
            method: "POST",
            body: JSON.stringify({
              boardSlug,
              category: category || undefined,
              title: title.trim(),
              isNotice: canPostNotice ? isNotice : undefined,
              // 정본은 JSON — HTML/평문은 서버가 파생시킨다
              contentJson: content.doc,
            }),
          });
      // 올라갔으니 임시저장은 남길 이유가 없다
      clearDraft(draftKey);
      // 상세 화면이 캐시된 본문을 보여주지 않게 서버 데이터를 다시 읽힌다
      router.replace(`/board/${boardSlug}/${post.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : editing
            ? "글을 수정하지 못했어요."
            : "글을 등록하지 못했어요.",
      );
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
      {pending && <DraftBanner savedAt={pending.savedAt} onRestore={restore} onDiscard={discard} />}

      <BoardSelect
        boardGroups={boardGroups}
        boardSlug={boardSlug}
        category={category}
        categories={currentBoard.categories}
        onBoardChange={(slug) => {
          setBoardSlug(slug);
          setCategory(""); // 게시판이 바뀌면 말머리도 초기화
        }}
        onCategoryChange={setCategory}
        lockBoard={Boolean(editing)}
      />

      <input
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder="제목을 입력해 주세요"
        className="w-full border-b border-gray-200 px-1 py-3 text-lg font-semibold outline-none focus:border-ocean-500"
      />

      <RichEditor
        key={editorKey}
        defaultValue={editorKey > 0 ? content.doc : (editing?.contentJson ?? undefined)}
        placeholder={PLACEHOLDER}
        uploadImage={uploadImageFor(boardSlug)}
        onChange={(doc, empty) => setContent({ doc, empty })}
      />

      {!editing && (
      <div className="rounded-lg bg-ocean-50 p-3 text-xs text-ocean-800">
        💡 <b>로그 연결</b> — 내 로그북의 다이빙 기록을 첨부하면 수심 · 수온 · 시야가 카드로 표시돼요. (추후 구현)
      </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-coral-500">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        {savedAt ? (
          <span className="text-xs text-gray-400">임시저장됨 · {sinceLabel(savedAt)}</span>
        ) : editing ? (
          <span className="text-xs text-gray-400">수정하면 등록 시간은 그대로 유지돼요.</span>
        ) : canPostNotice ? (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={isNotice}
              onChange={(e) => setIsNotice(e.target.checked)}
              className="accent-ocean-600"
            />
            공지로 올리기
          </label>
        ) : (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" defaultChecked className="accent-ocean-600" /> 댓글 허용
          </label>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveManually}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            임시저장
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-ocean-600 px-5 py-2 text-sm font-semibold text-white hover:bg-ocean-700 disabled:opacity-60"
          >
            {submitting ? (editing ? "저장 중…" : "등록 중…") : editing ? "수정 완료" : "등록"}
          </button>
        </div>
      </div>
    </form>
  );
}
