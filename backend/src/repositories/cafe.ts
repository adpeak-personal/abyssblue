// 카페 정보 저장소 — 현재는 인메모리 mock 사용. MySQL 전환 시 이 파일만 교체.
import { CAFE_INFO, popularTags, seaConditions } from "../data/mock.js";

export function getCafeOverview() {
  return { ...CAFE_INFO, seaConditions, popularTags };
}
