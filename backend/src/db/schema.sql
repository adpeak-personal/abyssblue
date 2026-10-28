-- =====================================================================
-- 어비스 블루 (abyssblue) MySQL 8 스키마
-- 적용: mysql -u root -p < src/db/schema.sql
-- 도메인 타입: src/types.ts (frontend/src/types/index.ts 와 동기화)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS abyssblue
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE abyssblue;

SET NAMES utf8mb4;

-- 재적용 시 의존성 역순으로 삭제
DROP TABLE IF EXISTS tour_participants;
DROP TABLE IF EXISTS tours;
DROP TABLE IF EXISTS dive_log_sightings;
DROP TABLE IF EXISTS dive_logs;
DROP TABLE IF EXISTS dive_point_water_temps;
DROP TABLE IF EXISTS dive_points;
DROP TABLE IF EXISTS uploads;
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS boards;
DROP TABLE IF EXISTS board_groups;
DROP TABLE IF EXISTS phone_verifications;
DROP TABLE IF EXISTS users;

-- ---------------------------------------------------------------------
-- 회원
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL COMMENT 'bcrypt 해시',
  nickname       VARCHAR(30)  NOT NULL,
  avatar_color   CHAR(7)      NOT NULL DEFAULT '#0e7490',
  level          ENUM('새싹','물방울','파도','산호','고래','운영진') NOT NULL DEFAULT '새싹',
  -- 정지/탈퇴는 행을 지우지 않고 상태로 둔다. 글·댓글이 회원을 참조하고 있어서다
  status         ENUM('활동','정지','탈퇴') NOT NULL DEFAULT '활동',
  suspended_until DATETIME    NULL COMMENT 'NULL 이면 무기한 정지',
  status_reason  VARCHAR(200) NULL COMMENT '정지·탈퇴 사유 (운영 기록용)',
  cert_agency    ENUM('PADI','SSI','NAUI','CMAS','SDI','KUDA') NOT NULL,
  cert_level     VARCHAR(100) NOT NULL,
  total_dives    INT UNSIGNED NOT NULL DEFAULT 0,
  bio            VARCHAR(500) NULL,
  phone          VARCHAR(20)  NULL COMMENT '휴대폰 인증 완료 번호 (숫자만). 중복 가입 차단에 쓴다',
  provider       ENUM('kakao','naver') NULL COMMENT '소셜 로그인으로 만든 계정',
  provider_id    VARCHAR(191) NULL COMMENT '소셜 쪽 고유 ID',
  last_login_at  DATETIME     NULL,
  joined_at      DATE         NOT NULL DEFAULT (CURRENT_DATE),
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_nickname (nickname),
  UNIQUE KEY uq_users_phone (phone),
  -- 같은 소셜 계정으로 두 번 가입되지 않게
  UNIQUE KEY uq_users_provider (provider, provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 휴대폰 인증
--
-- 가입 전 단계라 회원과 연결되지 않는다. 코드는 해시로 저장한다 —
-- DB 가 새어도 진행 중인 인증을 가로챌 수 없게.
-- ---------------------------------------------------------------------
CREATE TABLE phone_verifications (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone       VARCHAR(20)  NOT NULL COMMENT '숫자만',
  code_hash   CHAR(64)     NOT NULL COMMENT 'SHA-256(코드+번호)',
  purpose     ENUM('signup','reset') NOT NULL DEFAULT 'signup',
  attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '틀린 횟수',
  verified_at DATETIME     NULL,
  expires_at  DATETIME     NOT NULL,
  ip          VARCHAR(45)  NULL COMMENT '발송 요청 IP — 남용 차단용',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_phone_verif_phone (phone, created_at),
  KEY idx_phone_verif_ip (ip, created_at),
  KEY idx_phone_verif_cleanup (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 게시판 그룹 / 게시판
-- ---------------------------------------------------------------------
CREATE TABLE board_groups (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_board_groups_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE boards (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id     INT UNSIGNED NOT NULL,
  slug         VARCHAR(50)  NOT NULL,
  name         VARCHAR(100) NOT NULL,
  description  VARCHAR(255) NOT NULL DEFAULT '',
  type         ENUM('list','gallery','qna') NOT NULL DEFAULT 'list' COMMENT '목록 표시 형식',
  write_mode   ENUM('editor','photo') NOT NULL DEFAULT 'editor' COMMENT '글 작성 화면 (에디터 / 사진 업로더)',
  high_quality TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '사진 고화질 보관 여부',
  categories   JSON         NULL COMMENT '말머리 목록 (문자열 배열)',
  icon         VARCHAR(50)  NULL,
  sort_order   INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_boards_slug (slug),
  KEY idx_boards_group (group_id, sort_order),
  CONSTRAINT fk_boards_group FOREIGN KEY (group_id) REFERENCES board_groups (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 게시글 / 댓글 / 좋아요
-- ---------------------------------------------------------------------
CREATE TABLE posts (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  board_id       INT UNSIGNED NOT NULL,
  author_id      INT UNSIGNED NOT NULL,
  category       VARCHAR(30)  NULL COMMENT '말머리',
  title          VARCHAR(200) NOT NULL,
  content        MEDIUMTEXT   NOT NULL COMMENT '평문 — 목록 미리보기·전문검색용 (content_json 에서 파생)',
  content_json   JSON         NULL COMMENT '정본 — ProseMirror 문서. 에디터로 쓴 글에만 있다',
  content_html   MEDIUMTEXT   NULL COMMENT 'content_json 에서 서버가 파생·살균한 HTML. 읽기 화면은 이걸 쓴다',
  thumbnail_url  VARCHAR(255) NULL COMMENT '목록 썸네일 — 본문 첫 이미지',
  image_count    SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '본문 이미지 개수',
  views          INT UNSIGNED NOT NULL DEFAULT 0,
  likes          INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'post_likes 집계 캐시',
  comment_count  INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'comments 집계 캐시',
  is_notice      TINYINT(1)   NOT NULL DEFAULT 0,
  has_image      TINYINT(1)   NOT NULL DEFAULT 0,
  thumb_color    VARCHAR(30)  NULL,
  price          INT UNSIGNED NULL COMMENT '중고장터 가격',
  trade_status   ENUM('판매중','예약중','판매완료') NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     DATETIME     NULL COMMENT '소프트 삭제',
  PRIMARY KEY (id),
  KEY idx_posts_board_created (board_id, is_notice, created_at),
  KEY idx_posts_board_category (board_id, category, created_at),
  KEY idx_posts_author (author_id),
  KEY idx_posts_popular (likes, views),
  FULLTEXT KEY ft_posts_title_content (title, content) WITH PARSER ngram,
  CONSTRAINT fk_posts_board  FOREIGN KEY (board_id)  REFERENCES boards (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users (id)  ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE comments (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id     INT UNSIGNED NOT NULL,
  author_id   INT UNSIGNED NOT NULL,
  parent_id   INT UNSIGNED NULL COMMENT '대댓글',
  content     TEXT         NOT NULL,
  likes       INT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_comments_post_created (post_id, created_at),
  KEY idx_comments_author (author_id),
  KEY idx_comments_parent (parent_id),
  CONSTRAINT fk_comments_post   FOREIGN KEY (post_id)   REFERENCES posts (id)    ON DELETE CASCADE,
  CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users (id)    ON DELETE RESTRICT,
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE post_likes (
  post_id     INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  KEY idx_post_likes_user (user_id),
  CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 스크랩 (북마크)
--
-- 좋아요와 따로 두는 이유: 좋아요는 글에 대한 평가라 집계가 공개되고,
-- 스크랩은 "나중에 볼 글" 이라 본인에게만 보인다. posts 에 집계 컬럼도 두지 않는다.
-- ---------------------------------------------------------------------
CREATE TABLE post_scraps (
  post_id     INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  -- 마이페이지의 "내 스크랩" 은 최신순이라 user_id + created_at 로 찾는다
  KEY idx_post_scraps_user (user_id, created_at),
  CONSTRAINT fk_post_scraps_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_post_scraps_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 댓글 좋아요
--
-- comments.likes 는 이 테이블의 개수를 캐시한 값이다 — 목록에서 매번 세지 않으려고.
-- ---------------------------------------------------------------------
CREATE TABLE comment_likes (
  comment_id  INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id, user_id),
  KEY idx_comment_likes_user (user_id),
  CONSTRAINT fk_comment_likes_comment FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 신고
--
-- 글·댓글·회원을 같은 표로 받는다. target_type 으로 나누고, 대상이 지워져도
-- 신고 기록은 남아야 하므로 외래키를 걸지 않는다 (운영 이력이기 때문).
-- ---------------------------------------------------------------------
CREATE TABLE reports (
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
  -- 같은 사람이 같은 대상을 여러 번 신고하지 못하게
  UNIQUE KEY uq_reports_once (target_type, target_id, reporter_id),
  KEY idx_reports_status (status, created_at),
  KEY idx_reports_target (target_type, target_id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_handler  FOREIGN KEY (handled_by)  REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 알림
--
-- 내 글에 달린 댓글, 내 댓글의 답글, 받은 좋아요 등.
-- 읽음 여부만 들고 있고 본문은 만들 때 박아 둔다 — 원본이 지워져도 "무슨 알림이었는지"는
-- 남아야 하고, 목록을 띄울 때마다 글·댓글을 조인하지 않기 위해서다.
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL COMMENT '받는 사람',
  actor_id    INT UNSIGNED NULL COMMENT '행동한 사람 (시스템 알림이면 NULL)',
  type        ENUM('댓글','답글','좋아요','공지','운영') NOT NULL,
  message     VARCHAR(200) NOT NULL,
  link        VARCHAR(300) NOT NULL DEFAULT '/',
  read_at     DATETIME     NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- 안 읽은 것부터 최신순으로 뽑는다
  KEY idx_notifications_user (user_id, read_at, created_at),
  CONSTRAINT fk_notifications_user  FOREIGN KEY (user_id)  REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 업로드 이미지
--
-- 파일은 업로드 즉시 저장되고, 글 등록 시 post_id 가 채워진다.
-- 글을 안 쓰고 나간 파일은 post_id 가 NULL 로 남으므로 그것만 주기적으로 지운다:
--   DELETE FROM uploads WHERE post_id IS NULL AND created_at < NOW() - INTERVAL 1 DAY;
-- (파일시스템을 훑을 필요 없이 이 한 줄로 대상이 나온다)
-- ---------------------------------------------------------------------
CREATE TABLE uploads (
  id            CHAR(36)     NOT NULL COMMENT 'UUID — 저장 파일명과 같다',
  uploader_id   INT UNSIGNED NULL COMMENT '인증 도입 전이라 NULL 가능 — TODO: 세션에서 채운다',
  post_id       INT UNSIGNED NULL COMMENT 'NULL 이면 아직 어느 글에도 안 쓰인 파일',
  url           VARCHAR(255) NOT NULL COMMENT '본문용 상대경로 (/uploads/YYYY/MM/uuid.webp)',
  thumb_url     VARCHAR(255) NULL COMMENT '목록 썸네일',
  archive_url   VARCHAR(255) NULL COMMENT '고화질 보관본 (high_quality 게시판만)',
  mime          VARCHAR(50)  NOT NULL,
  bytes         INT UNSIGNED NOT NULL COMMENT '파생본 합계',
  width         SMALLINT UNSIGNED NULL,
  height        SMALLINT UNSIGNED NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_uploads_url (url),
  KEY idx_uploads_orphan (post_id, created_at),
  KEY idx_uploads_uploader (uploader_id, created_at),
  -- 회원이 지워져도 기록은 남겨야 파일을 청소할 수 있다 (CASCADE 면 파일만 남고 추적 불가)
  CONSTRAINT fk_uploads_uploader FOREIGN KEY (uploader_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_uploads_post     FOREIGN KEY (post_id)     REFERENCES posts (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 다이빙 포인트
-- ---------------------------------------------------------------------
CREATE TABLE dive_points (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  region        ENUM('동해','남해','제주','서해','해외') NOT NULL,
  area          VARCHAR(100) NOT NULL,
  country       VARCHAR(50)  NOT NULL DEFAULT '대한민국',
  difficulty    ENUM('초급','중급','상급') NOT NULL,
  depth_min     DECIMAL(5,1) NOT NULL,
  depth_max     DECIMAL(5,1) NOT NULL,
  visibility    VARCHAR(30)  NOT NULL COMMENT '예: 10~25m',
  best_season   VARCHAR(50)  NOT NULL DEFAULT '',
  entry_types   JSON         NOT NULL COMMENT '["비치","보트"]',
  marine_life   JSON         NOT NULL COMMENT '대표 생물 문자열 배열',
  shops         JSON         NOT NULL COMMENT '제휴 샵 문자열 배열',
  description   TEXT         NOT NULL,
  rating        DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  review_count  INT UNSIGNED NOT NULL DEFAULT 0,
  lat           DECIMAL(9,6) NOT NULL,
  lng           DECIMAL(9,6) NOT NULL,
  gradient      VARCHAR(30)  NOT NULL DEFAULT 'deep',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dive_points_region_difficulty (region, difficulty),
  KEY idx_dive_points_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE dive_point_water_temps (
  point_id  INT UNSIGNED     NOT NULL,
  month     TINYINT UNSIGNED NOT NULL,
  temp      DECIMAL(4,1)     NOT NULL,
  PRIMARY KEY (point_id, month),
  CONSTRAINT chk_water_temp_month CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT fk_water_temps_point FOREIGN KEY (point_id) REFERENCES dive_points (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 다이브 로그
-- ---------------------------------------------------------------------
CREATE TABLE dive_logs (
  id           INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED     NOT NULL,
  dive_no      INT UNSIGNED     NOT NULL,
  dive_date    DATE             NOT NULL,
  point_id     INT UNSIGNED     NULL,
  point_name   VARCHAR(100)     NOT NULL COMMENT '포인트 삭제/미등록 대비 비정규화',
  max_depth    DECIMAL(5,1)     NOT NULL,
  avg_depth    DECIMAL(5,1)     NOT NULL,
  bottom_time  SMALLINT UNSIGNED NOT NULL COMMENT '분',
  water_temp   DECIMAL(4,1)     NOT NULL,
  visibility   DECIMAL(5,1)     NOT NULL COMMENT 'm',
  suit         VARCHAR(50)      NOT NULL,
  weight       DECIMAL(4,1)     NOT NULL COMMENT 'kg',
  tank_start   SMALLINT UNSIGNED NOT NULL COMMENT 'bar',
  tank_end     SMALLINT UNSIGNED NOT NULL COMMENT 'bar',
  buddy        VARCHAR(50)      NULL,
  -- 작성 화면에서 받는 부가 정보. 다이브 컴퓨터가 주는 값이 아니라 선택 입력이다
  dive_time    TIME             NULL COMMENT '입수 시각',
  entry_type   ENUM('보트','비치') NULL,
  current      ENUM('없음','약함','보통','강함') NULL COMMENT '조류',
  weather      ENUM('맑음','흐림','비') NULL,
  waves        ENUM('잔잔','약간','높음') NULL,
  tank         VARCHAR(50)      NULL COMMENT '탱크 종류',
  -- 끄면 포인트 상세의 "최근 회원 로그" 에 안 뜬다. 내 로그북에는 그대로 남는다
  is_public    TINYINT(1)       NOT NULL DEFAULT 1,
  memo         TEXT             NOT NULL,
  rating       TINYINT UNSIGNED NOT NULL DEFAULT 3,
  created_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dive_logs_user_no (user_id, dive_no),
  KEY idx_dive_logs_user_date (user_id, dive_date),
  KEY idx_dive_logs_point (point_id),
  CONSTRAINT chk_dive_logs_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_dive_logs_user  FOREIGN KEY (user_id)  REFERENCES users (id)       ON DELETE CASCADE,
  CONSTRAINT fk_dive_logs_point FOREIGN KEY (point_id) REFERENCES dive_points (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE dive_log_sightings (
  id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  log_id   INT UNSIGNED NOT NULL,
  species  VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sightings_log_species (log_id, species),
  KEY idx_sightings_species (species),
  CONSTRAINT fk_sightings_log FOREIGN KEY (log_id) REFERENCES dive_logs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 투어 / 모집
-- ---------------------------------------------------------------------
CREATE TABLE tours (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  host_id      INT UNSIGNED NOT NULL,
  title        VARCHAR(200) NOT NULL,
  type         ENUM('번개','정기투어','해외투어','교육') NOT NULL,
  point_name   VARCHAR(100) NOT NULL,
  region       ENUM('동해','남해','제주','서해','해외') NOT NULL,
  start_date   DATE         NOT NULL,
  end_date     DATE         NOT NULL,
  capacity     SMALLINT UNSIGNED NOT NULL,
  joined       SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'tour_participants 집계 캐시',
  price        INT UNSIGNED NOT NULL DEFAULT 0,
  min_cert     VARCHAR(100) NOT NULL DEFAULT '',
  status       ENUM('모집중','마감임박','마감') NOT NULL DEFAULT '모집중',
  description  TEXT         NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tours_status_start (status, start_date),
  KEY idx_tours_type_start (type, start_date),
  KEY idx_tours_host (host_id),
  CONSTRAINT chk_tours_dates CHECK (end_date >= start_date),
  CONSTRAINT fk_tours_host FOREIGN KEY (host_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tour_participants (
  tour_id    INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  status     ENUM('신청','확정','대기','취소') NOT NULL DEFAULT '신청',
  joined_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tour_id, user_id),
  KEY idx_tour_participants_user (user_id),
  CONSTRAINT fk_tour_participants_tour FOREIGN KEY (tour_id) REFERENCES tours (id) ON DELETE CASCADE,
  CONSTRAINT fk_tour_participants_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
