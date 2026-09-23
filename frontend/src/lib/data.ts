// 데이터 접근 레이어 — 지금은 mock, 추후 backend API(fetch)로 교체할 지점
import {
  CURRENT_USER_ID,
  allBoards,
  comments,
  diveLogs,
  divePoints,
  posts,
  tours,
  users,
} from "@/data/mock";
import type { Difficulty, Region } from "@/types";

export function getUser(id: number) {
  return users.find((u) => u.id === id)!;
}

export function getCurrentUser() {
  return getUser(CURRENT_USER_ID);
}

export function getBoard(slug: string) {
  return allBoards.find((b) => b.slug === slug);
}

export function getPosts(opts: { boardSlug?: string; category?: string; q?: string; page?: number; size?: number } = {}) {
  const { boardSlug, category, q, page = 1, size = 15 } = opts;
  let list = posts.filter((p) => (boardSlug ? p.boardSlug === boardSlug : !p.isNotice));
  if (category) list = list.filter((p) => p.category === category);
  if (q) list = list.filter((p) => p.title.includes(q) || p.content.includes(q));
  list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { items: list.slice((page - 1) * size, page * size), total: list.length, page, size };
}

export function getNotices(limit = 3) {
  return posts.filter((p) => p.isNotice).slice(0, limit);
}

export function getPopularPosts(limit = 8) {
  return posts
    .filter((p) => !p.isNotice)
    .sort((a, b) => b.likes * 10 + b.views - (a.likes * 10 + a.views))
    .slice(0, limit);
}

export function getPost(id: number) {
  return posts.find((p) => p.id === id);
}

export function getComments(postId: number) {
  return comments.filter((c) => c.postId === postId);
}

export function getPoints(opts: { region?: Region; difficulty?: Difficulty; q?: string } = {}) {
  return divePoints.filter(
    (p) =>
      (!opts.region || p.region === opts.region) &&
      (!opts.difficulty || p.difficulty === opts.difficulty) &&
      (!opts.q || p.name.includes(opts.q) || p.area.includes(opts.q)),
  );
}

export function getPoint(id: number) {
  return divePoints.find((p) => p.id === id);
}

export function getLogs(userId: number) {
  return diveLogs.filter((l) => l.userId === userId).sort((a, b) => b.diveNo - a.diveNo);
}

export function getLogStats(userId: number) {
  const logs = getLogs(userId);
  const user = getUser(userId);
  return {
    totalDives: user.totalDives,
    maxDepth: Math.max(...logs.map((l) => l.maxDepth)),
    totalBottomTime: logs.reduce((s, l) => s + l.bottomTime, 0),
    avgWaterTemp: Math.round(logs.reduce((s, l) => s + l.waterTemp, 0) / logs.length),
    pointsVisited: new Set(logs.map((l) => l.pointId)).size,
  };
}

export function getTours(type?: string) {
  return tours.filter((t) => !type || t.type === type);
}
