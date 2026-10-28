// 카페 개요.
//
// 회원 수·오늘 글 수·등록 포인트 수는 DB 에서 센다.
// 이름·슬로건처럼 바뀌지 않는 값과 편집용 콘텐츠(바다 날씨·인기 태그)는
// 아직 mock 에 둔다 — 관리 화면이 생기면 그때 옮긴다.
import type { RowDataPacket } from "mysql2";
import { queryOne } from "../db/pool.js";
import { CAFE_INFO, popularTags, seaConditions } from "../data/mock.js";

interface CountsRow extends RowDataPacket {
  memberCount: number;
  todayPosts: number;
  pointCount: number;
  newMembersToday: number;
  latestMember: string | null;
}

export async function getCafeOverview() {
  const row = await queryOne<CountsRow>(`
    SELECT (SELECT COUNT(*) FROM users) AS memberCount,
           (SELECT COUNT(*) FROM posts
             WHERE deleted_at IS NULL AND created_at >= CURDATE()) AS todayPosts,
           (SELECT COUNT(*) FROM dive_points) AS pointCount,
           (SELECT COUNT(*) FROM users WHERE created_at >= CURDATE()) AS newMembersToday,
           (SELECT nickname FROM users ORDER BY created_at DESC, id DESC LIMIT 1) AS latestMember`);

  return {
    ...CAFE_INFO,
    memberCount: Number(row?.memberCount ?? 0),
    todayPosts: Number(row?.todayPosts ?? 0),
    pointCount: Number(row?.pointCount ?? 0),
    newMembersToday: Number(row?.newMembersToday ?? 0),
    latestMember: row?.latestMember ?? null,
    seaConditions,
    popularTags,
  };
}
