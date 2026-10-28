"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Check, Heart, Share2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";

/**
 * 좋아요 · 스크랩 · 공유.
 *
 * 서버가 토글 결과로 현재 상태와 개수를 함께 돌려주므로 화면은 그 값을 따른다 —
 * 직접 +1 하면 다른 기기에서 누른 것과 어긋난다.
 */
export function PostReactions({
  postId,
  initialLikes,
  initialLiked,
  initialScrapped,
  loggedIn,
}: {
  postId: number;
  initialLikes: number;
  initialLiked: boolean;
  initialScrapped: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [scrapped, setScrapped] = useState(initialScrapped);
  const [busy, setBusy] = useState<"like" | "scrap" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needLogin = () => {
    router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
  };

  const onLike = async () => {
    if (!loggedIn) return needLogin();
    setBusy("like");
    setError(null);
    try {
      const r = await apiFetch<{ liked: boolean; likes: number }>(`/posts/${postId}/like`, {
        method: "POST",
      });
      setLiked(r.liked);
      setLikes(r.likes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  const onScrap = async () => {
    if (!loggedIn) return needLogin();
    setBusy("scrap");
    setError(null);
    try {
      const r = await apiFetch<{ scrapped: boolean }>(`/posts/${postId}/scrap`, { method: "POST" });
      setScrapped(r.scrapped);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    const url = location.href;
    try {
      // 모바일은 기본 공유 시트가 자연스럽다
      if (navigator.share) await navigator.share({ url, title: document.title });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* 사용자가 공유를 취소한 경우 — 알릴 게 없다 */
    }
  };

  return (
    <div className="mt-10">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onLike}
          disabled={busy === "like"}
          aria-pressed={liked}
          className={`flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
            liked
              ? "border-coral-400 bg-orange-50 text-coral-500"
              : "border-gray-200 text-gray-700 hover:border-coral-400 hover:text-coral-500"
          }`}
        >
          <Heart size={17} fill={liked ? "currentColor" : "none"} /> 좋아요 {likes}
        </button>

        <button
          type="button"
          onClick={onScrap}
          disabled={busy === "scrap"}
          aria-pressed={scrapped}
          aria-label={scrapped ? "스크랩 해제" : "스크랩"}
          title={scrapped ? "스크랩 해제" : "스크랩"}
          className={`rounded-full border p-2.5 transition disabled:opacity-60 ${
            scrapped
              ? "border-ocean-400 bg-ocean-50 text-ocean-600"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Bookmark size={17} fill={scrapped ? "currentColor" : "none"} />
        </button>

        <button
          type="button"
          onClick={onShare}
          aria-label="공유"
          title="링크 복사"
          className="rounded-full border border-gray-200 p-2.5 text-gray-500 hover:bg-gray-50"
        >
          {copied ? <Check size={17} className="text-ocean-600" /> : <Share2 size={17} />}
        </button>
      </div>

      {copied && <p className="mt-2 text-center text-xs text-ocean-600">링크를 복사했어요.</p>}
      {error && (
        <p role="alert" className="mt-2 text-center text-xs text-coral-500">
          {error}
        </p>
      )}
    </div>
  );
}
