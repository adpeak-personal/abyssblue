import { CAFE_INFO } from "@/data/mock";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

/** 정사각형 심볼 로고 */
export function Logo({ size = 30 }: { size?: number }) {
  if (BRAND.logoSymbol) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={BRAND.logoSymbol} alt="" width={size} height={size} className="object-contain" style={{ width: size, height: size }} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#147aa8" />
      <path d="M4 18c3-2 5-2 8 0s5 2 8 0 5-2 8 0v5a12 12 0 0 1-24 0z" fill="#7fc9ef" />
      <circle cx="20" cy="10" r="2.2" fill="#fff" />
      <circle cx="15" cy="7" r="1.3" fill="#fff" opacity=".8" />
    </svg>
  );
}

/**
 * 가로형 로고. 로고 이미지가 있으면 이미지 한 장, 없으면 심볼 + 카페명 조합.
 * className 으로 높이를 지정한다 (예: "h-8").
 */
export function BrandLogo({ className = "h-8", symbolSize = 30 }: { className?: string; symbolSize?: number }) {
  if (BRAND.logoFull) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={BRAND.logoFull} alt={CAFE_INFO.name} className={cn("w-auto object-contain", className)} />;
  }
  return (
    <span className="flex items-center gap-2">
      <Logo size={symbolSize} />
      <span className="text-lg font-extrabold tracking-tight text-ocean-900">{CAFE_INFO.name}</span>
    </span>
  );
}
