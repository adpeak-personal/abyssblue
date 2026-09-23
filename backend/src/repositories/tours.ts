// 투어/모집 저장소 — 현재는 인메모리 mock 배열 사용. MySQL 전환 시 이 파일만 교체.
import { tours } from "../data/mock.js";
import type { Tour } from "../types.js";

export interface TourQuery {
  type?: Tour["type"];
  status?: Tour["status"];
}

export function listTours(query: TourQuery = {}): Tour[] {
  return tours
    .filter((t) => (!query.type || t.type === query.type) && (!query.status || t.status === query.status))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function findTourById(id: number): Tour | undefined {
  return tours.find((t) => t.id === id);
}
