import { apiGet } from "@/lib/api";

type Provider = "kakao" | "naver";

const STYLES: Record<Provider, { label: string; className: string }> = {
  kakao: { label: "카카오", className: "bg-[#FEE500] text-[#191919] hover:brightness-95" },
  naver: { label: "네이버", className: "bg-[#03C75A] text-white hover:brightness-95" },
};

/**
 * 간편 로그인 버튼.
 *
 * 어떤 제공자를 쓸 수 있는지는 서버가 정한다 — 키가 없으면 그 버튼은 "준비중" 으로
 * 남는다. 화면에서 따로 켜고 끄지 않으므로 키를 넣는 순간 바로 동작한다.
 *
 * 링크를 거쳐 백엔드로 직접 보내는 이유: OAuth 는 브라우저가 제공자 사이트로
 * 이동해야 하는 흐름이라 fetch 로는 처리할 수 없다.
 */
export async function SocialButtons() {
  const res = await apiGet<{ providers: Provider[] }>("/auth/oauth/providers").catch(() => null);
  const ready = new Set(res?.providers ?? []);

  return (
    <div className="space-y-2">
      {(Object.keys(STYLES) as Provider[]).map((provider) => {
        const { label, className } = STYLES[provider];
        const enabled = ready.has(provider);

        return enabled ? (
          <a
            key={provider}
            href={`/api/auth/oauth/${provider}`}
            className={`block w-full rounded-lg py-3 text-center text-sm font-semibold ${className}`}
          >
            {label}로 시작하기
          </a>
        ) : (
          <button
            key={provider}
            type="button"
            disabled
            title="아직 연결 전이에요"
            className={`w-full cursor-not-allowed rounded-lg py-3 text-sm font-semibold opacity-50 ${className}`}
          >
            {label}로 시작하기 (준비중)
          </button>
        );
      })}
    </div>
  );
}
