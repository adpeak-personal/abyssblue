# 어비스 블루 백엔드 (Fastify + TypeScript)

스쿠버다이빙 커뮤니티 **어비스 블루** 의 API 서버입니다.
현재는 MySQL 없이 **인메모리 더미데이터**(`src/data/mock.ts`)로 동작하며, 서버를 재시작하면 작성한 글/댓글/로그는 초기화됩니다.

## 요구사항

- Node.js 20 이상 (개발 환경: Node 24)
- npm

## 실행 방법

```powershell
cd backend
npm install
copy .env.example .env   # 필요 시 값 수정

npm run dev        # 개발 서버 (tsx watch, 파일 변경 시 자동 재시작)
npm run typecheck  # 타입 검사
npm run build      # dist/ 로 컴파일
npm start          # 빌드 결과 실행 (node dist/server.js)
```

기본 주소: `http://localhost:4000` / 프론트엔드(`http://localhost:3000`)에 대해 CORS 허용.

### 환경변수 (`.env`)

| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| `PORT` | `4000` | 서버 포트 |
| `CORS_ORIGIN` | `http://localhost:3000` | 허용 오리진 (쉼표로 여러 개) |
| `DATABASE_URL` | `mysql://root:password@localhost:3306/abyssblue` | MySQL 전환 후 사용 (현재 미사용) |

## 폴더 구조

```
src/
  server.ts          # 진입점 (포트/환경변수)
  app.ts             # buildApp() — CORS, 에러 핸들러, /api 라우트 등록
  types.ts           # 도메인 타입 (frontend/src/types/index.ts 와 동기화)
  data/mock.ts       # 더미데이터 (frontend/src/data/mock.ts 와 동기화)
  lib/http.ts        # 공통 헬퍼 (404, 파라미터 스키마)
  repositories/      # 데이터 접근 계층 — MySQL 전환 시 여기만 교체
  routes/            # API 라우트 (zod 로 요청 검증)
  db/                # MySQL schema.sql / seed.sql / 안내 README
```

## API 목록

모든 경로의 prefix 는 `/api` 입니다.
오류 응답은 `{ "message": "..." }` 형태이며, 검증 실패(400)는 `issues` 배열을 함께 반환합니다.

### 공통

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/health` | 헬스 체크 |
| GET | `/api/cafe` | 카페 정보 + 바다 상황(`seaConditions`) + 인기 태그(`popularTags`) |

### 게시판 / 게시글

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/boards` | 게시판 그룹 목록 |
| GET | `/api/boards/:slug` | 게시판 상세 |
| GET | `/api/boards/:slug/posts?page=&size=&category=&q=` | 게시글 목록 (최신순, `notice` 게시판만 공지 상단 고정). 응답 `{ items, total, page, size }`, 각 글에 `author` 포함 |
| GET | `/api/posts/popular?limit=` | 인기글 (좋아요+조회수 기준, 기본 10개) |
| GET | `/api/posts/:id` | 게시글 상세 + `author` + `comments`(작성자 포함) |
| POST | `/api/posts` | 게시글 작성 → 201 |
| POST | `/api/posts/:id/comments` | 댓글 작성 → 201 |

`POST /api/posts` 예시:

```json
{ "boardSlug": "free", "category": "잡담", "title": "제목", "content": "내용", "authorId": 4 }
```

`POST /api/posts/:id/comments` 예시:

```json
{ "authorId": 4, "content": "댓글 내용", "parentId": 1 }
```

### 다이빙 포인트

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/points?region=&difficulty=&q=` | 포인트 목록 (region: 동해/남해/제주/서해/해외, difficulty: 초급/중급/상급) |
| GET | `/api/points/:id` | 포인트 상세 |

### 다이브 로그

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/logs?userId=` | 로그 목록 (최신순) |
| GET | `/api/logs/stats?userId=` | 통계 `{ totalDives, maxDepth, totalBottomTime(분), avgWaterTemp, pointsVisited }` |
| POST | `/api/logs` | 로그 작성 → 201 (`diveNo` 자동 부여, `pointName` 생략 시 포인트명 사용) |

### 투어 / 모집

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/tours?type=&status=` | 투어 목록 (type: 번개/정기투어/해외투어/교육, status: 모집중/마감임박/마감), `host` 포함 |
| GET | `/api/tours/:id` | 투어 상세 |

### 회원 / 인증 (스텁)

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/users/:id` | 공개 프로필 (email 제외) |
| POST | `/api/auth/signup` | 회원가입 — `email`, `password`(8자 이상), `nickname`, `certAgency`, `certLevel` 검증 후 사용자 + 가짜 토큰 반환 |
| POST | `/api/auth/login` | 로그인 — mock 사용자에 존재하는 이메일이면 가짜 토큰 반환 (비밀번호 미검증) |

> ⚠️ 인증은 아직 스텁입니다. `TODO: bcrypt + JWT + MySQL` 주석 위치에서 실제 구현이 필요합니다.

## MySQL 전환

`src/db/README.md` 를 참고하세요. 라우트는 `src/repositories/*` 만 호출하므로 저장소 계층만 교체하면 됩니다.
