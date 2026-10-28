/**
 * 운영진으로 오해할 수 있는 이메일 차단.
 *
 * `admin` 이 들어간 주소는 운영진 계정으로 오해받기 쉽다. 글쓴이 이름 옆에
 * 이메일이 보이진 않지만, 비밀번호 찾기·문의 과정에서 사칭에 쓰일 수 있다.
 * 그래서 아래 목록에 없는 `admin` 주소는 가입 자체를 막는다.
 *
 * 운영진 계정을 늘리려면 ALLOWED 에 주소를 더한다 — 등급(운영진)은 가입 뒤
 * 어드민 회원 관리에서 따로 올린다. 여기 넣는다고 운영진이 되는 건 아니다.
 */

/** 이 주소들만 `admin` 이 들어가도 가입할 수 있다 */
const ALLOWED = new Set([
  "abyssblue_yeom@abyssblue.com",
  "admin@abyssblue.com",
  "abyssblue_yeom@abyssblue.co.kr",
  "admin@abyssblue.co.kr",
]);

/** 막는 낱말 — 대소문자는 무시한다 (`Admin@…` 도 같은 것으로 본다) */
const BLOCKED_WORDS = ["admin"];

export const RESERVED_EMAIL_MESSAGE = "사용할 수 없는 이메일입니다.";

/**
 * 가입이 막히는 주소인지.
 *
 * 주소 전체를 본다 — `admin@…` 뿐 아니라 `me@admin.kr` 처럼 도메인으로 흉내 내는 것도 막는다.
 * 그 탓에 `kim@admin-corp.co.kr` 같은 실제 주소도 걸릴 수 있는데,
 * 그런 분은 운영진이 ALLOWED 에 넣어 주면 된다.
 */
export function isReservedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (ALLOWED.has(normalized)) return false;
  return BLOCKED_WORDS.some((word) => normalized.includes(word));
}

/** 화면·스크립트에서 목록을 보여줄 때 */
export const allowedAdminEmails = () => [...ALLOWED];
