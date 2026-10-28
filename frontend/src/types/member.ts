import type { MemberLevel } from "@/types";

export const MEMBER_LEVELS: MemberLevel[] = ["새싹", "물방울", "파도", "산호", "고래", "운영진"];
export const MEMBER_STATUSES = ["활동", "정지", "탈퇴"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export interface Member {
  id: number;
  email: string;
  nickname: string;
  avatarColor: string;
  level: MemberLevel;
  status: MemberStatus;
  suspendedUntil?: string;
  statusReason?: string;
  certAgency: string;
  certLevel: string;
  /** 가운데를 가린 번호 — 운영 화면에서도 전체를 보여줄 이유가 없다 */
  phoneMasked?: string;
  provider?: string;
  joinedAt: string;
  lastLoginAt?: string;
  postCount: number;
  commentCount: number;
  reportCount: number;
}

export const REPORT_REASONS = [
  "스팸/광고",
  "욕설/비방",
  "음란물",
  "허위정보",
  "안전 위험",
  "기타",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportStatus = "접수" | "처리완료" | "반려";

export interface Report {
  id: number;
  targetType: "post" | "comment" | "user";
  targetId: number;
  reason: ReportReason;
  detail?: string;
  status: ReportStatus;
  handlerMemo?: string;
  handledAt?: string;
  createdAt: string;
  reporter?: string;
  handler?: string;
  /** 신고 대상의 내용 요약. 지워졌으면 없다 */
  targetLabel?: string;
  targetAuthor?: string;
  targetAuthorId?: number;
  link?: string;
}

export interface Notification {
  id: number;
  type: "댓글" | "답글" | "좋아요" | "공지" | "운영";
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
  actor?: { nickname: string; avatarColor: string };
}
