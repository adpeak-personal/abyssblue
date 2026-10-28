"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { PhotoUploader, type PhotoItem } from "@/components/photo-uploader";
import { ApiError, apiFetch, uploadImageFor } from "@/lib/api";
import { BoardSelect } from "./BoardSelect";
import { DraftBanner } from "./DraftBanner";
import { clearDraft, sinceLabel, useAutoDraft, usePendingDraft } from "./useDraft";
import type { EditTarget } from "./types";
import type { Board, BoardGroup } from "@/types";

/**
 * 사진 중심 게시판(writeMode: "photo")의 작성 폼.
 *
 * 화면은 에디터와 전혀 다르지만 **저장 포맷은 같다** — 사진과 글을
 * 똑같은 ProseMirror JSON 으로 바꿔서 보낸다. 그래야 읽기 화면·앱·검색이
 * 작성 방식에 따라 갈라지지 않는다.
 */
function toDoc(photos: PhotoItem[], text: string): JSONContent {
  const content: JSONContent[] = [];

  // 본문 글이 먼저, 그 다음 사진 — 배달앱 후기와 같은 순서
  for (const line of text.split("\n")) {
    content.push(
      line.trim()
        ? { type: "paragraph", content: [{ type: "text", text: line }] }
        : { type: "paragraph" },
    );
  }

  for (const photo of photos) {
    content.push({ type: "image", attrs: { src: photo.url, alt: photo.caption || "" } });
    if (photo.caption) {
      content.push({
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [{ type: "text", text: photo.caption }],
      });
    }
  }

  return { type: "doc", content };
}

/**
 * 저장된 문서를 다시 사진 + 글로 되돌린다 (수정 화면용).
 *
 * toDoc 의 역함수다 — 첫 이미지 앞까지가 본문 글, 이미지 뒤에 붙은
 * 가운데 정렬 문단은 그 사진의 설명이다. 다른 화면(에디터)에서 쓴 글을
 * 여기로 열면 구조가 다를 수 있으므로, 알아볼 수 있는 것만 살리고 나머지는 글로 모은다.
 */
function fromDoc(doc: JSONContent | null): { photos: PhotoItem[]; text: string } {
  const photos: PhotoItem[] = [];
  const lines: string[] = [];
  let seenImage = false;

  for (const node of doc?.content ?? []) {
    if (node.type === "image" && typeof node.attrs?.src === "string") {
      seenImage = true;
      photos.push({ id: `${photos.length}-${node.attrs.src}`, url: node.attrs.src, caption: "" });
      continue;
    }

    const text = (node.content ?? [])
      .map((c) => (typeof c.text === "string" ? c.text : ""))
      .join("");

    // 사진 바로 뒤의 가운데 정렬 문단은 그 사진의 설명
    const last = photos[photos.length - 1];
    if (seenImage && last && !last.caption && node.attrs?.textAlign === "center" && text) {
      last.caption = text;
      continue;
    }
    if (!seenImage) lines.push(text);
  }

  return { photos, text: lines.join("\n").trim() };
}

/** 임시저장에 담는 내용 — 게시판은 키에 들어간다 */
interface PhotoDraft {
  category: string;
  title: string;
  photos: PhotoItem[];
  text: string;
}

export function PhotoForm({
  boardGroups,
  board,
  editing,
}: {
  boardGroups: BoardGroup[];
  board: Board;
  /** 넘어오면 수정 모드 — 같은 폼을 쓰고 전송만 PATCH 로 바뀐다 */
  editing?: EditTarget;
}) {
  const router = useRouter();

  const initial = fromDoc(editing?.contentJson ?? null);
  const [boardSlug, setBoardSlug] = useState(editing?.boardSlug ?? board.slug);
  const [category, setCategory] = useState(editing?.category ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [photos, setPhotos] = useState<PhotoItem[]>(initial.photos);
  const [text, setText] = useState(initial.text);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 사진 게시판도 같은 방식으로 보관한다. 사진은 이미 업로드돼 있어서 url 만 담으면 된다
  const draftKey = editing ? `photo:edit:${editing.id}` : `photo:new:${boardSlug}`;
  const { pending, decided, settle } = usePendingDraft<PhotoDraft>(draftKey);

  const { savedAt, saveNow } = useAutoDraft<PhotoDraft>(
    draftKey,
    { category, title, photos, text },
    decided && (title.trim().length > 0 || photos.length > 0 || text.trim().length > 0),
  );

  const restore = () => {
    if (!pending) return;
    setCategory(pending.data.category);
    setTitle(pending.data.title);
    setPhotos(pending.data.photos);
    setText(pending.data.text);
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
    if (photos.length === 0) return setError("사진을 한 장 이상 올려주세요.");

    setSubmitting(true);
    try {
      const doc = toDoc(photos, text);
      const post = editing
        ? await apiFetch<{ id: number }>(`/posts/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify({ category: category || null, title: title.trim(), contentJson: doc }),
          })
        : await apiFetch<{ id: number }>("/posts", {
            method: "POST",
            body: JSON.stringify({
              boardSlug,
              category: category || undefined,
              title: title.trim(),
              contentJson: doc,
            }),
          });
      clearDraft(draftKey);
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
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      {pending && <DraftBanner savedAt={pending.savedAt} onRestore={restore} onDiscard={discard} />}

      <BoardSelect
        boardGroups={boardGroups}
        boardSlug={boardSlug}
        category={category}
        categories={currentBoard.categories}
        onBoardChange={(slug) => {
          setBoardSlug(slug);
          setCategory("");
        }}
        onCategoryChange={setCategory}
        lockBoard={Boolean(editing)}
      />

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder="제목을 입력해 주세요"
        className="w-full border-b border-gray-200 px-1 py-3 text-lg font-semibold outline-none focus:border-ocean-500"
      />

      <PhotoUploader photos={photos} onChange={setPhotos} uploadImage={uploadImageFor(boardSlug)} maxCount={30} />

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        maxLength={5000}
        placeholder={"사진에 대한 설명을 남겨주세요.\n· 촬영 포인트, 수심, 장비 정보를 적어주시면 다른 다이버에게 도움이 돼요."}
        className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-[15px] leading-7 outline-none focus:border-ocean-400"
      />

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
