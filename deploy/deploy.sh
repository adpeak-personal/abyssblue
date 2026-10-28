#!/usr/bin/env bash
# 서버에서 실행: 이미지 받기 → 재시작
#   GitHub Actions 가 /opt/abyssblue 에 올려서 돌린다. GHCR 토큰은 stdin 첫 줄로 받는다 (인자·화면에 안 남게).
#   ABYSSBLUE_TAG  배포할 이미지 태그 (기본 latest)
#   GHCR_USER      GHCR 로그인 사용자
#
# DB 표 변경은 여기서 하지 않는다 — 운영 이미지에 tsx 가 없고, 자동으로 건드리면
# 실패했을 때 되돌리기가 어렵다. 스키마를 바꾼 배포라면 먼저 손으로 db:migrate 를 돌릴 것.
set -euo pipefail
cd /opt/abyssblue

test -f .env || { echo "/opt/abyssblue/.env 가 없습니다 (deploy/.env.example 참고)" >&2; exit 1; }

read -r GHCR_TOKEN || true
if [ -n "${GHCR_TOKEN:-}" ]; then
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:?}" --password-stdin
  trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT
fi
unset GHCR_TOKEN

export ABYSSBLUE_TAG="${ABYSSBLUE_TAG:-latest}"
echo "== abyssblue 배포: $ABYSSBLUE_TAG"

docker compose pull
docker compose up -d --remove-orphans

# 떠 있는 태그를 .env 에 적어 둔다 — 서버에서 손으로 `docker compose up -d api` 해도
# 같은 이미지를 쓰게 (안 적어 두면 latest 를 받으려다 GHCR 로그인이 없어 unauthorized)
if grep -q '^ABYSSBLUE_TAG=' .env; then
  sed -i "s/^ABYSSBLUE_TAG=.*/ABYSSBLUE_TAG=${ABYSSBLUE_TAG}/" .env
else
  printf '\n# 지금 떠 있는 이미지 — deploy.sh 가 배포 때마다 적는다 (손대지 말 것)\nABYSSBLUE_TAG=%s\n' "$ABYSSBLUE_TAG" >> .env
fi

# api·web 둘 다 healthy 가 될 때까지 (각각 최대 2분)
fail=0
for name in abyssblue-api abyssblue-web; do
  status=none
  for _ in $(seq 1 24); do
    status=$(docker inspect -f '{{.State.Health.Status}}' "$name" 2>/dev/null || echo none)
    [ "$status" = healthy ] && break
    sleep 5
  done
  if [ "$status" != healthy ]; then
    echo "$name 가 healthy 가 아닙니다 ($status)" >&2
    docker compose logs --tail 80 "${name#abyssblue-}" >&2
    fail=1
  fi
done

docker compose ps
[ "$fail" -eq 0 ] || exit 1

docker image prune -f >/dev/null
echo "== 완료: $ABYSSBLUE_TAG"
