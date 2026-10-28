"use client";

import { useCallback, useEffect, useState } from "react";

const PREFIX = "abyss:draft:";

/**
 * 임시저장 보관 기한.
 *
 * 고아 이미지 청소 유예(`uploads:gc` 기본 24시간)와 맞춘다 — 그보다 오래된 임시글은
 * 본문에 박힌 이미지가 이미 지워졌을 수 있어서 복구해 봐야 깨진 사진만 남는다.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** 저장 전 기다리는 시간 — 타자 한 글자마다 쓰면 느려진다 */
const DEBOUNCE_MS = 1500;

interface Stored<T> {
  savedAt: number;
  data: T;
}

const storageKey = (key: string) => PREFIX + key;

/**
 * 임시저장은 이 브라우저에만 남는다 (localStorage).
 *
 * 서버에 두지 않는 이유 — 본문 이미지는 이미 업로드 시점에 서버에 저장되므로
 * 임시글이 들고 있어야 할 건 글자와 배치뿐이고, 그건 쓰던 기기에서 이어 쓰면 된다.
 * 대신 사생활이 남지 않도록 등록에 성공하면 바로 지운다.
 */
export function readDraft<T>(key: string): Stored<T> | null {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Stored<T>;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(storageKey(key));
      return null;
    }
    return parsed;
  } catch {
    // 사생활 보호 모드 · 용량 초과 · 깨진 값 — 임시저장이 없을 뿐이다
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    /* 지우지 못해도 글쓰기를 막을 이유는 없다 */
  }
}

/**
 * 보관된 임시글이 있는지 알아본다.
 *
 * `decided` 는 "복구할지 말지 정해졌다" 는 뜻이다. 정해지기 전에는 자동저장을 멈춰야
 * 빈 글이 임시글을 덮어쓰지 않는다. 임시글이 아예 없으면 처음부터 정해진 것으로 본다.
 */
export function usePendingDraft<T>(key: string) {
  const [state, setState] = useState<{ pending: Stored<T> | null; decided: boolean }>({
    pending: null,
    decided: false,
  });

  useEffect(() => {
    const draft = readDraft<T>(key);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage 는 서버 렌더에 없다. 첫 그림 뒤에 한 번 읽는 게 맞다
    setState({ pending: draft, decided: draft === null });
  }, [key]);

  /** 불러오든 버리든, 결정이 끝났다 */
  const settle = useCallback(() => setState({ pending: null, decided: true }), []);

  return { ...state, settle };
}

/**
 * 값이 바뀌면 잠시 뒤 자동으로 보관한다.
 *
 * @param enabled 복구 여부를 아직 못 정했거나 빈 글이면 꺼 둔다 —
 *                안 그러면 사용자가 "불러오기" 를 누르기도 전에 빈 글이 덮어쓴다.
 */
export function useAutoDraft<T>(key: string, data: T, enabled: boolean) {
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // 내용이 실제로 달라졌을 때만 타이머를 다시 건다.
  // 객체 자체를 의존성으로 쓰면 매 렌더마다 새 객체라 저장이 끝없이 반복된다.
  const serialized = JSON.stringify(data);

  const save = useCallback(
    (payload: string) => {
      try {
        const at = Date.now();
        localStorage.setItem(storageKey(key), `{"savedAt":${at},"data":${payload}}`);
        setSavedAt(at);
      } catch {
        /* 용량 초과 등 — 조용히 넘어간다. 임시저장 실패로 글쓰기를 막지 않는다 */
      }
    },
    [key],
  );

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => save(serialized), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // 입력이 멈춰야 저장된다
  }, [serialized, enabled, save]);

  return { savedAt, saveNow: () => save(serialized) };
}

/** "방금 전" · "3분 전" — 임시저장 시각 표시용 */
export function sinceLabel(at: number) {
  const sec = Math.floor((Date.now() - at) / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
}
