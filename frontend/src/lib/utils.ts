/**
 * "방금 전" · "3시간 전" · "09.14".
 *
 * 기준 시각은 호출할 때마다 읽는다. 예전에는 더미데이터에 맞춘 고정 날짜를
 * 상수로 박아 둬서, 실제로 쓴 글이 전부 그 날짜 기준으로 계산됐다
 * (미래가 되어 언제까지나 "방금 전" 으로 보였다).
 */
export function formatRelative(iso: string) {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  // 서버와 브라우저의 시계가 몇 초 어긋날 수 있다 — 미래로 계산돼도 "방금 전"
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}시간 전`;
  return formatDate(iso);
}

export function formatDate(iso: string) {
  const date = new Date(iso);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  if (date.getFullYear() === new Date().getFullYear()) return `${mm}.${dd}`;
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
