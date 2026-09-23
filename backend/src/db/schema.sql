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
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS boards;
DROP TABLE IF EXISTS board_groups;
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
  cert_agency    ENUM('PADI','SSI','NAUI','CMAS','SDI','KUDA') NOT NULL,
  cert_level     VARCHAR(100) NOT NULL,
  total_dives    INT UNSIGNED NOT NULL DEFAULT 0,
  region         VARCHAR(50)  NOT NULL DEFAULT '',
  bio            VARCHAR(500) NULL,
  joined_at      DATE         NOT NULL DEFAULT (CURRENT_DATE),
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_nickname (nickname)
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
  type         ENUM('list','gallery','qna') NOT NULL DEFAULT 'list',
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
  content        MEDIUMTEXT   NOT NULL,
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
