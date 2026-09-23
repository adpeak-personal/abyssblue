// 브랜드 로고 설정 — frontend/public/ 의 파일 경로. null 이면 기본 SVG 로고 사용
export const BRAND = {
  /** 정사각형 로고 (512x512) */
  logoSymbol: "/logo2.png" as string | null,
  /** 가로형 로고 (600x150) — 헤더, 로그인 화면 등 */
  logoFull: "/logo.png" as string | null,
  /** 로고 원본 컬러 (= ocean-500) */
  color: "#20a3d9",
};
