-- =====================================================================
-- abyssblue 운영 DB 와 계정 만들기
--
-- 공용 DB 서버(158.247.244.167)에서 root 로 실행한다:
--   docker exec -i shared-db mysql -uroot -p < 01-database.sql
--
-- ⚠ 아래 <여기에_비밀번호> 를 /opt/abyssblue/.env 의 DB_PASSWORD 와
--   똑같은 값으로 바꿔서 실행할 것. 다르면 백엔드가 Access denied 로 뜬다.
--   이 파일에 실제 비밀번호를 적어 저장하지 말 것 — 이 저장소는 공개다.
--
-- 적용 순서
--   1) 이 파일
--   2) backend/src/db/schema.sql      표 만들기
--   3) deploy/seed-config.sql         게시판·다이브 포인트
-- =====================================================================

CREATE DATABASE IF NOT EXISTS abyssblue
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

-- 앱 서버(141)에서 붙는 계정
CREATE USER IF NOT EXISTS 'abyssblue'@'141.164.60.58'
  IDENTIFIED BY '<여기에_비밀번호>';

-- 내 PC 에서 ssh 터널로 붙을 때 쓰는 계정.
-- 터널은 DB 서버 안에서 끝나므로 접속이 localhost 에서 온 것으로 보인다.
CREATE USER IF NOT EXISTS 'abyssblue'@'127.0.0.1'
  IDENTIFIED BY '<여기에_비밀번호>';

-- 권한은 abyssblue 스키마 안으로만. 다른 프로젝트 DB 는 건드릴 수 없다.
--
-- DDL(CREATE/ALTER/DROP/INDEX)까지 주는 이유: 스키마 변경을 npm run db:migrate 로
-- 이 계정으로 돌린다. 분리하고 싶으면 아래를 DML 만 남기고, 마이그레이션은 root 로 돌린다.
GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, DROP, INDEX, REFERENCES
  ON abyssblue.* TO 'abyssblue'@'141.164.60.58';

GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, DROP, INDEX, REFERENCES
  ON abyssblue.* TO 'abyssblue'@'127.0.0.1';

FLUSH PRIVILEGES;

-- 확인
SELECT user, host FROM mysql.user WHERE user = 'abyssblue';
SHOW GRANTS FOR 'abyssblue'@'141.164.60.58';
