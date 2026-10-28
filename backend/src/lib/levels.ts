// 등급 자동 승급 규칙.
//
// 마이페이지의 "등급 안내" 에 적힌 기준이 곧 이 파일이다 — 화면과 로직이 갈리면
// 약속한 조건과 실제 승급이 달라진다. 기준을 바꾸려면 여기와 화면을 같이 고칠 것.
//
// 승급만 하고 강등은 하지 않는다. 글을 지웠다고 등급이 내려가면
// "내 글 정리했더니 등급이 떨어졌다" 는 황당한 경험이 된다.
import type { MemberLevel } from "../types.js";

export interface Activity {
  posts: number;
  comments: number;
  logs: number;
  /** 가입 후 지난 일수 */
  daysSinceJoin: number;
}

export interface LevelRule {
  level: MemberLevel;
  /** 화면에 그대로 보여 줄 설명 */
  label: string;
  meets(a: Activity): boolean;
}

/** 아래에서 위로 올라가는 순서 */
export const LEVEL_RULES: LevelRule[] = [
  { level: "새싹", label: "가입 즉시", meets: () => true },
  {
    level: "물방울",
    label: "글 5 · 댓글 20",
    meets: (a) => a.posts >= 5 && a.comments >= 20,
  },
  {
    level: "파도",
    label: "글 20 · 가입 30일",
    meets: (a) => a.posts >= 20 && a.daysSinceJoin >= 30,
  },
  {
    level: "산호",
    label: "글 50 · 로그 100",
    meets: (a) => a.posts >= 50 && a.logs >= 100,
  },
  {
    level: "고래",
    label: "글 150 · 로그 500",
    meets: (a) => a.posts >= 150 && a.logs >= 500,
  },
];

/** 운영진은 활동량과 무관한 자리라 자동 승급 대상이 아니다 */
export const isAutoLevel = (level: MemberLevel) => level !== "운영진";

/**
 * 활동량으로 도달 가능한 가장 높은 등급.
 *
 * 위에서부터 훑어 처음 만족하는 것을 고른다 — 중간 단계를 건너뛰어도 괜찮다.
 * (로그만 많고 글이 적은 사람이 영영 못 올라가는 걸 막는 것은 규칙의 몫이다.)
 */
export function levelFor(activity: Activity): MemberLevel {
  for (let i = LEVEL_RULES.length - 1; i >= 0; i--) {
    if (LEVEL_RULES[i].meets(activity)) return LEVEL_RULES[i].level;
  }
  return "새싹";
}

const ORDER: MemberLevel[] = ["새싹", "물방울", "파도", "산호", "고래", "운영진"];

/** 승급만 허용 — 내려가야 하면 undefined */
export function promotionFor(current: MemberLevel, activity: Activity): MemberLevel | undefined {
  if (!isAutoLevel(current)) return undefined;
  const next = levelFor(activity);
  return ORDER.indexOf(next) > ORDER.indexOf(current) ? next : undefined;
}
