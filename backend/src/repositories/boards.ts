// 게시판 저장소 — 현재는 인메모리 mock 배열 사용. MySQL 전환 시 이 파일만 교체.
import { allBoards, boardGroups } from "../data/mock.js";
import type { Board, BoardGroup } from "../types.js";

export function listBoardGroups(): BoardGroup[] {
  return boardGroups;
}

export function findBoardBySlug(slug: string): Board | undefined {
  return allBoards.find((b) => b.slug === slug);
}
