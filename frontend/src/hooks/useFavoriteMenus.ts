"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_FAVORITES, HOME_MENU_ID, MAX_FAVORITES } from "@/lib/menu";

// TODO: 로그인 연동 후 backend 사용자 설정(예: PUT /api/users/me/favorite-menus)으로 저장 위치 이전
const STORAGE_KEY = "abyssblue:favorite-menus";
const CHANGE_EVENT = "favorite-menus-change";

let cachedRaw: string | null | undefined;
let cachedValue: string[] = DEFAULT_FAVORITES;

function normalize(ids: string[]) {
  const unique = [...new Set(ids.filter((id) => id !== HOME_MENU_ID))];
  return [HOME_MENU_ID, ...unique.slice(0, MAX_FAVORITES)];
}

function readRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot() {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedValue = raw ? normalize(JSON.parse(raw)) : DEFAULT_FAVORITES;
    } catch {
      cachedValue = DEFAULT_FAVORITES;
    }
  }
  return cachedValue;
}

function getServerSnapshot() {
  return DEFAULT_FAVORITES;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalize(ids)));
  } catch {
    // 저장 불가(시크릿 모드 등) — 무시
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** 개인별 자주 쓰는 메뉴 (홈은 항상 첫 번째 고정) */
export function useFavoriteMenus() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(
    (id: string) => {
      if (id === HOME_MENU_ID) return;
      write(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
    },
    [ids],
  );

  const move = useCallback(
    (id: string, dir: -1 | 1) => {
      const i = ids.indexOf(id);
      const j = i + dir;
      if (i <= 0 || j <= 0 || j >= ids.length) return; // 홈(0번) 자리는 고정
      const next = [...ids];
      [next[i], next[j]] = [next[j], next[i]];
      write(next);
    },
    [ids],
  );

  const reset = useCallback(() => write(DEFAULT_FAVORITES), []);

  return { ids, toggle, move, reset, addedCount: ids.length - 1, isFull: ids.length - 1 >= MAX_FAVORITES };
}
