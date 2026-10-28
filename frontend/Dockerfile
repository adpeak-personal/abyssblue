# syntax=docker/dockerfile:1

# 1) 의존성 설치
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) 빌드
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# next.config.ts 의 rewrite 목적지는 빌드 때 .next 안에 구워진다 — 런타임 env 로는 못 바꾼다.
# 그래서 백엔드 주소를 빌드 인자로 받는다. 기본값은 compose 안에서 api 컨테이너를 가리킨다.
# (서버 컴포넌트가 쓰는 API_BASE_URL 은 런타임 값이라 compose 의 environment 로 준다)
ARG API_ORIGIN=http://api:5030
ENV API_ORIGIN=$API_ORIGIN

RUN npm run build

# 3) 실행 (standalone 결과물만 복사)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 5000

CMD ["node", "server.js"]
