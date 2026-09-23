// 다이빙 포인트 저장소 — 현재는 인메모리 mock 배열 사용. MySQL 전환 시 이 파일만 교체.
import { divePoints } from "../data/mock.js";
import type { Difficulty, DivePoint, Region } from "../types.js";

export interface PointQuery {
  region?: Region;
  difficulty?: Difficulty;
  q?: string;
}

export function listPoints(query: PointQuery = {}): DivePoint[] {
  const keyword = query.q?.trim().toLowerCase();
  return divePoints.filter((p) => {
    if (query.region && p.region !== query.region) return false;
    if (query.difficulty && p.difficulty !== query.difficulty) return false;
    if (keyword) {
      const haystack = [p.name, p.area, p.country, p.description, ...p.marineLife].join(" ").toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });
}

export function findPointById(id: number): DivePoint | undefined {
  return divePoints.find((p) => p.id === id);
}
