/** 조건부 클래스 합치기 — 모듈을 프로젝트 유틸에서 떼어놓기 위해 자체 보유 */
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
