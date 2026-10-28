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

공용 DB 서버(`158.247.244.167`)에 `abyssblue` DB 와 계정이 있어야 한다. **아직 확인되지 않았다.**
없으면 만들고, 표는 내 PC 에서 터널을 열어 올린다:

```bash
ssh -N -L 13306:127.0.0.1:3306 root@158.247.244.167
```

```bash
cd backend && DB_HOST=127.0.0.1 DB_PORT=13306 DB_USER=abyssblue DB_PASSWORD='...' DB_NAME=abyssblue npm run db:migrate -- --yes
```

공용 DB 서버는 접속 IP 를 제한한다 — `141.164.60.58` 에서 3306 이 열려 있어야 한다.

### 5. nginx

[`nginx-abyssblue.conf`](nginx-abyssblue.conf) 의 도메인을 실제 주소로 바꾼 뒤:

```bash
sudo cp nginx-abyssblue.conf /etc/nginx/sites-available/abyssblue && sudo ln -sf /etc/nginx/sites-available/abyssblue /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx
```

```bash
sudo certbot --nginx -d abyssblue.co.kr -d www.abyssblue.co.kr
```

## 평소

### 스키마를 바꾼 배포

워크플로는 DB 표를 건드리지 않는다. **푸시하기 전에** 위 4번의 `db:migrate` 를 먼저 돌린다.
(운영 이미지에 `tsx` 가 없고, 표를 자동으로 건드리면 실패했을 때 되돌리기가 어렵다.)

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
