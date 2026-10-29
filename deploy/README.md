# 배포

`main` 에 푸시하면 GitHub Actions 가 **타입 검사 → 이미지 빌드(GHCR) → 서버(141) 배포**까지 한다.
dev 브랜치를 만들어도 설정을 바꿀 필요 없다 — `dev → main` merge 가 곧 `main` 푸시다.

워크플로: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

```
main 푸시
  └─ check   backend 타입 검사 (프론트는 next build 가 겸한다)
  └─ build   api · web 이미지 2개를 같은 sha 태그로 GHCR 에 올린다
  └─ deploy  141 에 ssh → docker compose pull → up -d → healthy 확인
```

이미지: `ghcr.io/adpeak-personal/abyssblue-api` · `-web`

## 최초 한 번만 (아직 안 되어 있다)

아래 Secrets 가 없으면 `deploy` 잡은 **실패가 아니라 건너뛴다**(회색 skipped).
이미지는 그대로 GHCR 에 올라가므로, 세팅 전에도 빌드가 되는지 Actions 에서 확인할 수 있다.
Secrets 를 넣는 순간부터 파일 수정 없이 배포가 돌기 시작한다.

### 1. 배포용 SSH 키

내 PC 에서:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/abyssblue_deploy -N "" -C "abyssblue github actions"
```

공개키를 서버에 등록:

```bash
ssh-copy-id -i ~/.ssh/abyssblue_deploy.pub root@141.164.60.58
```

### 2. 저장소 Secrets

GitHub → Settings → Secrets and variables → Actions → New repository secret

| 이름 | 값 |
|---|---|
| `DEPLOY_HOST` | `141.164.60.58` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | `~/.ssh/abyssblue_deploy` 파일 **전체 내용**(개인키) |

GHCR 토큰은 따로 만들지 않는다 — 워크플로 기본 `GITHUB_TOKEN` 을 쓴다.

### 3. 서버 준비

```bash
ssh root@141.164.60.58
mkdir -p /opt/abyssblue
```

포트가 비어 있는지 먼저 확인한다 (같은 서버에 peakboard 가 3050·3051 을 쓴다):

```bash
ss -ltnp | grep -E '306[01]'
```

쓰이고 있으면 `docker-compose.yml` 과 `nginx-abyssblue.conf` 의 포트를 같이 바꾼다.

`.env` 를 만든다 ([`.env.example`](.env.example) 참고). `JWT_SECRET` 이 없으면 서버가 뜨지 않는다:

```bash
# 내 PC 에서 값 만들기
cd backend && npm run gen:secret
```

```bash
chmod 600 /opt/abyssblue/.env
```

### 4. DB

공용 DB 서버(`158.247.244.167`)에 DB·계정을 만들고 표를 올린다. 순서대로 세 파일이다.

**(1) DB 와 계정** — `01-database.sql` 의 `<여기에_비밀번호>` 를 `/opt/abyssblue/.env` 의
`DB_PASSWORD` 와 같은 값으로 바꿔서, DB 서버에서 root 로 실행한다:

```bash
scp deploy/01-database.sql root@158.247.244.167:/tmp/
```

비밀번호는 컨테이너가 이미 환경변수로 들고 있는 걸 쓴다. `mysql -p` 로 물어보게 하면
터미널이 없어서(stdin 이 파일이다) 멈추거나 SQL 첫 줄을 비밀번호로 먹는다.

```bash
ssh root@158.247.244.167 "docker exec -i shared-db sh -c 'mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\"' < /tmp/01-database.sql && rm /tmp/01-database.sql"
```

그 환경변수가 없다면 (`docker exec shared-db printenv MYSQL_ROOT_PASSWORD` 로 확인),
컨테이너 안으로 넣고 `source` 로 실행한다 — 이쪽은 비밀번호를 직접 입력한다:

```bash
ssh root@158.247.244.167 "docker cp /tmp/01-database.sql shared-db:/tmp/ && rm /tmp/01-database.sql"
```

```bash
ssh -t root@158.247.244.167 "docker exec -it shared-db mysql -uroot -p -e 'source /tmp/01-database.sql' && docker exec shared-db rm /tmp/01-database.sql"
```

**(2) 표** — 내 PC 에서 터널을 열어 올린다. 터널은 띄워 둔 채로 다른 창에서 진행한다:

```bash
ssh -N -L 13306:127.0.0.1:3306 root@158.247.244.167
```

```bash
mysql -h 127.0.0.1 -P 13306 -u abyssblue -p abyssblue < backend/src/db/schema.sql
```

**(3) 게시판·다이브 포인트** — 운영진이 정하는 설정 데이터다. 빈 DB 에 이걸 안 넣으면
사이트에 게시판이 하나도 없다:

```bash
mysql -h 127.0.0.1 -P 13306 -u abyssblue -p abyssblue < deploy/seed-config.sql
```

`seed-config.sql` 은 로컬 DB 에서 뽑은 것이다. 게시판을 고친 뒤 다시 뽑으려면:

```bash
cd backend && npm run db:export-config
```

**방화벽** — 공용 DB 서버는 접속 IP 를 제한한다. 앱 서버에서 3306 이 열려 있어야 한다:

```bash
ssh root@158.247.244.167 "ufw status | grep 3306 || echo '3306 규칙 없음 — ufw allow from 141.164.60.58 to any port 3306'"
```

**확인** — 앱 서버에서 실제로 붙는지:

```bash
ssh root@141.164.60.58 "docker run --rm mysql:8.0 mysql -h 158.247.244.167 -u abyssblue -p -e 'SELECT COUNT(*) FROM abyssblue.boards'"
```

### 5. nginx  (2026-10-29 완료)

**이 서버는 `/etc/nginx/sites-enabled/default` 한 파일에 여러 사이트가 들어 있다.**
site-test001.shop · testby001.shop · atb.co.kr 이 각각 server 블록으로 있고,
인증서도 certbot 이 이미 발급해 두었다.

그래서 새 설정 파일을 `sites-enabled` 에 넣으면 안 된다 — `server_name` 이 중복되어
`nginx -t` 가 "duplicate listen options" 로 실패하고, 모든 사이트가 멈출 수 있다.
`default` 안의 해당 블록을 고친다. (`deploy/nginx-abyssblue.conf` 는 참고용 사본이다.)

실제로 한 일은 세 줄 추가와 한 줄 수정이다:

- `proxy_pass` 를 `127.0.0.1:3000`(옛 프론트) → `127.0.0.1:3060`(새 프론트)
- `client_max_body_size 20m;` — nginx 기본값이 1m 이라 없으면 사진 올릴 때 413 으로 막힌다
- `if ($host = www...) { return 301 ...; }` — www 를 비-www 로 넘긴다

**백업은 `sites-enabled` 밖에 둘 것.** nginx 는 그 폴더의 *모든* 파일을 읽으므로
`default.bak` 같은 파일도 설정으로 읽혀서 중복 오류가 난다. `/root/nginx-backups/` 에 둔다.

고친 뒤에는 반드시 순서대로:

```bash
ssh root@141.164.60.58 "nginx -t && systemctl reload nginx"
```

`nginx -t` 가 실패하면 reload 하지 말고 백업을 되돌린다.

**운영 도메인으로 옮길 때** 네 곳을 같이 바꾼다. 하나만 바꾸면 로그인이 깨진다.

1. `default` 의 `server_name` (과 www 리다이렉트의 호스트명)
2. `/opt/abyssblue/.env` 의 `CORS_ORIGIN` — 첫 항목이 소셜 로그인 후 돌아올 주소다
3. `certbot --nginx -d <새 도메인>`
4. 카카오·네이버 개발자센터의 리다이렉트 URI (쓰고 있다면)

`abyssblue.com` · `abyssblue.co.kr` 은 아직 다른 서버를 가리키므로 DNS 변경이 먼저다.

## 평소

### 스키마를 바꾼 배포

워크플로는 DB 표를 건드리지 않는다. 운영 이미지에 `tsx` 가 없고, 표를 자동으로
건드리면 실패했을 때 되돌리기가 어렵다. **푸시하기 전에** 손으로 올린다.

`schema.sql` 은 `DROP TABLE` 로 시작하므로 데이터가 든 DB 에 쓰면 안 된다 —
변경분만 올리는 `db:migrate` 를 쓴다 (여러 번 돌려도 안전하다).

터널을 띄워 두고:

```bash
ssh -N -L 13306:127.0.0.1:3306 root@158.247.244.167
```

무엇이 빠졌는지 먼저 보고:

```bash
cd backend && DB_HOST=127.0.0.1 DB_PORT=13306 DB_USER=abyssblue DB_PASSWORD='...' DB_NAME=abyssblue npm run db:migrate
```

맞으면 뒤에 `-- --yes` 를 붙여 다시 돌린다.

### 롤백

```bash
cd /opt/abyssblue && ABYSSBLUE_TAG=sha-abc1234 docker compose up -d
```

태그는 Actions 실행 목록이나 GHCR 패키지 페이지에서 확인한다.

### `.env` 를 고쳤을 때

```bash
cd /opt/abyssblue && docker compose up -d api
```

`restart` 는 `.env` 를 다시 읽지 않는다.

### 로그

```bash
cd /opt/abyssblue && docker compose logs -f --tail 100 api
```
