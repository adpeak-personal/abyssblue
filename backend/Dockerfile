# syntax=docker/dockerfile:1

# alpine(musl) 대신 slim(glibc) 을 쓴다 — sharp 의 프리빌드 바이너리가 더 확실하다.
# musl 쪽은 받아오지 못하면 소스 빌드로 넘어가면서 python·g++ 까지 필요해진다.

# 1) 의존성 설치 (빌드용 — typescript 포함)
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) 빌드 (tsc → dist)
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) 실행용 의존성만 다시 설치 — typescript·tsx 를 이미지에 넣지 않는다
FROM node:22-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 4) 실행
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5030
ENV HOST=0.0.0.0

# node 이미지에 이미 들어 있는 비권한 사용자로 돌린다
USER node

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
# "type": "module" 이 있어야 dist 의 ESM 이 돈다
COPY --chown=node:node package.json ./

EXPOSE 5030
CMD ["node", "dist/server.js"]
