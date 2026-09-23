const NOW = new Date("2026-09-15T12:00:00+09:00"); // 더미데이터 기준 시각

export function formatRelative(iso: string) {
  const date = new Date(iso);
  const diffMin = Math.floor((NOW.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}시간 전`;
  return formatDate(iso);
}

export function formatDate(iso: string) {
  const date = new Date(iso);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  if (date.getFullYear() === NOW.getFullYear()) return `${mm}.${dd}`;
  return `${date.getFullYear()}.${mm}.${dd}`;
}

export function formatNumber(n: number) {
  return n.toLocaleString("ko-KR");
}

export function formatPrice(n: number) {
  return n === 0 ? "무료" : `${n.toLocaleString("ko-KR")}원`;
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
