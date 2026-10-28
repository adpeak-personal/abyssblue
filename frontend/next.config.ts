import type { NextConfig } from "next";

// 백엔드 주소 — 브라우저에 노출되지 않는다 (rewrite 는 서버에서 프록시)
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:5030";

const nextConfig: NextConfig = {
  // 도커 배포용 — .next/standalone 에 실행에 필요한 파일만 모아준다
  output: "standalone",

  // 같은 오리진으로 프록시해서 CORS 를 없애고, 본문에는 상대경로만 저장한다.
  // 추후 이미지를 오브젝트 스토리지로 옮길 때 /uploads 목적지만 바꾸면
  // 이미 저장된 본문은 그대로 둘 수 있다.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_ORIGIN}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
