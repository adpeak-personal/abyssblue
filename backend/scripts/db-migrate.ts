// 이미 쓰고 있는 DB 에 스키마 변경분을 적용한다.
//
//   npm run db:migrate          무엇이 빠졌는지 보여주기만
//   npm run db:migrate -- --yes 실제 적용
//
// schema.sql 은 "처음부터 만들 때" 의 모습이라, 데이터가 들어 있는 DB 에는 쓸 수 없다.
// 여기 적힌 단계는 전부 "없을 때만" 적용되므로 여러 번 돌려도 안전하다.
import "dotenv/config";
import type { RowDataPacket } from "mysql2";
import { closePool, execute, queryOne } from "../src/db/pool.js";

interface Step {
  name: string;
  /** 이미 적용됐는지 */
  applied: () => Promise<boolean>;
  sql: string[];
}

const tableExists = async (table: string) => {
  const row = await queryOne<RowDataPacket & { n: number }>(
    `SELECT COUNT(*) AS n FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = ?`,
    [table],
  );
  return Number(row?.n ?? 0) > 0;
};

const columnExists = async (table: string, column: string) => {
  const row = await queryOne<RowDataPacket & { n: number }>(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  return Number(row?.n ?? 0) > 0;
};

const steps: Step[] = [
  {
    name: "post_scraps — 스크랩(북마크)",
    applied: () => tableExists("post_scraps"),
    sql: [
      `CREATE TABLE post_scraps (
         post_id     INT UNSIGNED NOT NULL,
         user_id     INT UNSIGNED NOT NULL,
         created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (post_id, user_id),
         KEY idx_post_scraps_user (user_id, created_at),
         CONSTRAINT fk_post_scraps_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
         CONSTRAINT fk_post_scraps_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
    ],
  },
  {
    name: "comment_likes — 댓글 좋아요",
    applied: () => tableExists("comment_likes"),
    sql: [
      `CREATE TABLE comment_likes (
         comment_id  INT UNSIGNED NOT NULL,
         user_id     INT UNSIGNED NOT NULL,
         created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (comment_id, user_id),
         KEY idx_comment_likes_user (user_id),
         CONSTRAINT fk_comment_likes_comment FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE,
         CONSTRAINT fk_comment_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
    ],
  },
  {
    name: "users.provider / provider_id — 소셜 로그인 연결",
    applied: () => columnExists("users", "provider"),
    sql: [
      `ALTER TABLE users
         ADD COLUMN provider    ENUM('kakao','naver') NULL COMMENT '소셜 로그인으로 만든 계정' AFTER phone,
         ADD COLUMN provider_id VARCHAR(191) NULL COMMENT '소셜 쪽 고유 ID' AFTER provider,
         ADD UNIQUE KEY uq_users_provider (provider, provider_id)`,
    ],
  },
  {
    name: "dive_logs 부가 정보 — 입수시각·조류·날씨·공개여부",
    applied: () => columnExists("dive_logs", "entry_type"),
    sql: [
      `ALTER TABLE dive_logs
         ADD COLUMN dive_time  TIME NULL COMMENT '입수 시각' AFTER buddy,
         ADD COLUMN entry_type ENUM('보트','비치') NULL AFTER dive_time,
         ADD COLUMN current    ENUM('없음','약함','보통','강함') NULL COMMENT '조류' AFTER entry_type,
         ADD COLUMN weather    ENUM('맑음','흐림','비') NULL AFTER current,
         ADD COLUMN waves      ENUM('잔잔','약간','높음') NULL AFTER weather,
         ADD COLUMN tank       VARCHAR(50) NULL COMMENT '탱크 종류' AFTER waves,
         ADD COLUMN is_public  TINYINT(1) NOT NULL DEFAULT 1 AFTER tank`,
    ],
  },
  {
    name: "users.status — 정지·탈퇴 상태",
    applied: () => columnExists("users", "status"),
    sql: [
      `ALTER TABLE users
         ADD COLUMN status          ENUM('활동','정지','탈퇴') NOT NULL DEFAULT '활동' AFTER level,
         ADD COLUMN suspended_until DATETIME NULL COMMENT 'NULL 이면 무기한 정지' AFTER status,
         ADD COLUMN status_reason   VARCHAR(200) NULL AFTER suspended_until`,
    ],
  },
  {
    name: "reports — 신고",
    applied: () => tableExists("reports"),
    sql: [
      `CREATE TABLE reports (
         id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
         target_type  ENUM('post','comment','user') NOT NULL,
         target_id    INT UNSIGNED NOT NULL,
         reporter_id  INT UNSIGNED NOT NULL,
         reason       ENUM('스팸/광고','욕설/비방','음란물','허위정보','안전 위험','기타') NOT NULL,
         detail       VARCHAR(500) NULL,
         status       ENUM('접수','처리완료','반려') NOT NULL DEFAULT '접수',
         handled_by   INT UNSIGNED NULL,
         handled_at   DATETIME     NULL,
         handler_memo VARCHAR(300) NULL,
         created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (id),
         UNIQUE KEY uq_reports_once (target_type, target_id, reporter_id),
         KEY idx_reports_status (status, created_at),
         KEY idx_reports_target (target_type, target_id),
         CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE,
         CONSTRAINT fk_reports_handler  FOREIGN KEY (handled_by)  REFERENCES users (id) ON DELETE SET NULL
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
    ],
  },
  {
    name: "notifications — 알림",
    applied: () => tableExists("notifications"),
    sql: [
      `CREATE TABLE notifications (
         id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
         user_id     INT UNSIGNED NOT NULL COMMENT '받는 사람',
         actor_id    INT UNSIGNED NULL COMMENT '행동한 사람 (시스템 알림이면 NULL)',
         type        ENUM('댓글','답글','좋아요','공지','운영') NOT NULL,
         message     VARCHAR(200) NOT NULL,
         link        VARCHAR(300) NOT NULL DEFAULT '/',
         read_at     DATETIME     NULL,
         created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (id),
         KEY idx_notifications_user (user_id, read_at, created_at),
         CONSTRAINT fk_notifications_user  FOREIGN KEY (user_id)  REFERENCES users (id) ON DELETE CASCADE,
         CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
    ],
  },
];

const confirmed = process.argv.includes("--yes");

async function main() {
  const pending: Step[] = [];
  for (const step of steps) {
    if (await step.applied()) console.log(`  이미 적용됨  ${step.name}`);
    else pending.push(step);
  }

  if (pending.length === 0) {
    console.log("\n✅ 적용할 변경이 없습니다.");
    return;
  }

  console.log("");
  for (const step of pending) console.log(`  적용 필요    ${step.name}`);

  if (!confirmed) {
    console.log("\n실제로 적용하려면: npm run db:migrate -- --yes");
    return;
  }

  console.log("");
  for (const step of pending) {
    for (const sql of step.sql) await execute(sql);
    console.log(`  ✔ ${step.name}`);
  }
  console.log("\n✅ 적용 완료");
}

try {
  await main();
} finally {
  await closePool();
}
