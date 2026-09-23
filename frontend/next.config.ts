import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 도커 배포용 — .next/standalone 에 실행에 필요한 파일만 모아준다
  output: "standalone",
};

export default nextConfig;
