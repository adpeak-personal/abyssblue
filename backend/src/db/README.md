# 데이터베이스 (MySQL 8)

현재 API 는 **인메모리 더미데이터**(`src/data/mock.ts`)로 동작합니다.
이 폴더의 SQL 파일은 MySQL 설치 후 바로 적용할 수 있도록 준비된 스키마/시드입니다.

| 파일 | 설명 |
| --- | --- |
| `schema.sql` | DB(`abyssblue`) 생성 + 전체 테이블/FK/인덱스 (utf8mb4). **재실행 시 기존 테이블을 DROP 합니다.** |
| `seed.sql` | 대표 데이터 일부(회원·게시판·게시글·포인트·로그·투어). 전체 mock 데이터는 아닙니다. |

## 1. MySQL 설치 (Windows)

1. [MySQL Community Downloads](https://dev.mysql.com/downloads/installer/) 에서 **MySQL Installer for Windows** 를 받습니다.
   - 또는 `winget install Oracle.MySQL`
2. 설치 유형은 `Server only` 또는 `Developer Default` 선택
3. 설정 단계에서
   - 포트: `3306`
   - 인증 방식: `Use Strong Password Encryption` (기본값)
   - root 비밀번호 설정 (예: `password` — 로컬 개발용)
   - Windows Service 로 등록 (자동 시작)
4. 설치 확인 (PowerShell):
   ```powershell
   mysql --version
   ```
   `mysql` 명령을 못 찾으면 `C:\Program Files\MySQL\MySQL Server 8.x\bin` 을 PATH 에 추가하세요.

## 2. 스키마 / 시드 적용

`backend` 폴더에서 실행합니다.

```powershell
# PowerShell 은 < 리다이렉션을 지원하지 않으므로 cmd 로 실행
cmd /c "mysql -u root -p < src\db\schema.sql"
cmd /c "mysql -u root -p abyssblue < src\db\seed.sql"
```

Git Bash 에서는 그대로 사용 가능합니다.

```bash
mysql -u root -p < src/db/schema.sql
mysql -u root -p abyssblue < src/db/seed.sql
```

확인:

```sql
USE abyssblue;
SHOW TABLES;
SELECT id, nickname, level FROM users;
```

## 3. 환경변수

`.env.example` 을 복사해 `.env` 를 만들고 접속 정보를 맞춥니다.

```
DATABASE_URL=mysql://root:password@localhost:3306/abyssblue
```

## 4. mock → MySQL 전환 방법

라우트(`src/routes/*`)는 데이터에 직접 접근하지 않고 **저장소 계층**(`src/repositories/*.ts`)만 호출합니다.
따라서 MySQL 전환 시 **repositories 만 교체**하면 되고, 라우트/응답 형태는 그대로 유지됩니다.

1. 드라이버 설치: `npm install mysql2`
2. `src/db/pool.ts` 등에서 `DATABASE_URL` 로 커넥션 풀 생성
3. `src/repositories/*.ts` 의 함수 본문을 SQL 쿼리로 교체
   - 함수 시그니처는 `async` (Promise 반환)로 바뀌므로 라우트에서 `await` 만 추가
   - DB 컬럼(snake_case) → 도메인 타입(camelCase, `src/types.ts`) 매핑은 저장소 안에서 처리
   - 예: `posts.board_id` → `boards.slug` 조인하여 `boardSlug`, `dive_point_water_temps` → `waterTemp[]`, `dive_log_sightings` → `sightings[]`
4. 모든 저장소 전환이 끝나면 `src/data/mock.ts` 의존성을 제거 (테스트용으로만 남겨도 됨)
5. 인증(`src/routes/auth.ts`)의 `TODO: bcrypt + JWT + MySQL` 부분 구현
   - `users.password_hash` 에 bcrypt 해시 저장, 로그인 시 JWT 발급

## 테이블 개요

- `users` — 회원 (이메일/닉네임 유니크, bcrypt 해시)
- `board_groups`, `boards` — 게시판 그룹과 게시판 (말머리는 JSON 배열)
- `posts`, `comments`, `post_likes` — 게시글, 댓글(대댓글 `parent_id`), 좋아요
- `dive_points`, `dive_point_water_temps` — 포인트와 월별 수온
- `dive_logs`, `dive_log_sightings` — 다이브 로그와 관찰 생물
- `tours`, `tour_participants` — 투어/모집과 참가자
