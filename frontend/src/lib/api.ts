// 백엔드 API 호출 — 브라우저에서는 next.config.ts 의 rewrite 를 타므로 상대경로(CORS 없음),
// 서버 컴포넌트에서는 절대주소가 필요해서 INTERNAL_API_BASE 를 쓴다.
import type { User } from "@/types";

const INTERNAL_API_BASE = process.env.API_BASE_URL ?? "http://localhost:5030";

export const apiUrl = (path: string) =>
  typeof window === "undefined" ? `${INTERNAL_API_BASE}/api${path}` : `/api${path}`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues?: { path: string; message: string }[],
    /** 429 일 때 서버가 알려주는 재시도까지 남은 초 */
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function toApiError(res: Response) {
  const body = await res.json().catch(() => null);
  return new ApiError(
    body?.message ?? "요청을 처리할 수 없습니다.",
    res.status,
    body?.issues,
    body?.retryAfterSeconds,
  );
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    // 로그인 쿠키를 함께 보낸다 — 없으면 쓰기 요청이 전부 401 이 된다
    credentials: "include",
    headers: {
      // 본문이 없을 때 Content-Type 을 붙이면 Fastify 가 400 으로 막는다 (DELETE 가 그렇다)
      ...(init?.body === undefined ? null : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  if (!res.ok) throw await toApiError(res);
  // 삭제는 204 로 본문 없이 온다 — json() 을 부르면 터진다
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** 목록/상세에 쓰는 작성자 포함 형태 (서버는 email 을 빼고 내려준다) */
export type WithAuthor<T> = T & { author: Omit<User, "email"> };

/**
 * 서버 렌더링용 조회 — 방금 쓴 글이 바로 보여야 하므로 캐시하지 않는다.
 *
 * 없는 자원(404)과 **백엔드에 닿지 못한 경우**를 null 로 돌려준다.
 * 백엔드를 재시작하는 동안 헤더·사이드바가 화면 전체를 에러로 만들던 걸 막는다 —
 * 부르는 쪽은 이미 전부 null 을 다루고 있다(`?? []`, `if (!x) …`).
 * 서버가 살아서 500 을 주는 건 진짜 문제이므로 그대로 터뜨린다.
 */
export async function apiGet<T>(path: string, headers?: Record<string, string>): Promise<T | null> {
  try {
    return await apiFetch<T>(path, { cache: "no-store", headers });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) return null;
      throw err;
    }
    // ApiError 가 아니면 응답 자체를 못 받은 것 (백엔드가 꺼졌거나 네트워크 문제)
    console.warn(`[apiGet] 백엔드에 닿지 못했습니다: ${path}`, err);
    return null;
  }
}

export interface UploadedImage {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

/**
 * 이미지 업로드.
 *
 * 반환 url 은 바로 띄울 수 있는 전체 주소(CDN)다. 본문에 저장할 때 서버가
 * 도메인을 떼고 경로만 보관하므로, 여기서 따로 가공하지 않는다.
 *
 * boardSlug 를 넘기면 서버가 그 게시판의 화질 정책(고화질 보관 여부)을 적용한다.
 */
export function uploadImageFor(boardSlug?: string) {
  return async (file: File): Promise<UploadedImage> => {
    const form = new FormData();
    form.append("file", file);

    const path = boardSlug
      ? `/uploads/image?boardSlug=${encodeURIComponent(boardSlug)}`
      : "/uploads/image";

    // FormData 는 boundary 를 브라우저가 붙이므로 Content-Type 을 직접 넣지 않는다
    const res = await fetch(apiUrl(path), { method: "POST", body: form, credentials: "include" });
    if (!res.ok) throw await toApiError(res);
    return res.json();
  };
}

/** 게시판을 모를 때 (기본 화질) */
export const uploadImage = uploadImageFor();
