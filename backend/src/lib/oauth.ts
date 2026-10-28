// 소셜 로그인 — 카카오 / 네이버.
//
// 키가 없으면 그 제공자는 그냥 꺼진 상태가 된다 (설정됨: false).
// Aligo 와 같은 방식이라, 키를 받기 전에도 나머지 흐름을 다 만들어 둘 수 있다.
//
// 문서
//   카카오 https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api
//   네이버 https://developers.naver.com/docs/login/api/api.md
import type { SocialProvider } from "../types.js";

export interface SocialProfile {
  /** 제공자 쪽 고유 ID — 이메일보다 이게 기준이다 (이메일은 바뀔 수 있다) */
  id: string;
  email?: string;
  nickname?: string;
}

interface ProviderSpec {
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  /** 동의 받을 항목 */
  scope?: string;
  parseProfile(raw: unknown): SocialProfile;
}

export class OAuthError extends Error {}

const SPECS: Record<SocialProvider, ProviderSpec> = {
  kakao: {
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    tokenUrl: "https://kauth.kakao.com/oauth/token",
    profileUrl: "https://kapi.kakao.com/v2/user/me",
    scope: "account_email profile_nickname",
    parseProfile(raw) {
      const body = raw as {
        id?: number | string;
        kakao_account?: { email?: string; profile?: { nickname?: string } };
      };
      if (body.id == null) throw new OAuthError("카카오 프로필을 읽지 못했습니다.");
      return {
        id: String(body.id),
        // 이메일 제공 동의는 선택 항목이라 없을 수 있다
        email: body.kakao_account?.email,
        nickname: body.kakao_account?.profile?.nickname,
      };
    },
  },
  naver: {
    authorizeUrl: "https://nid.naver.com/oauth2.0/authorize",
    tokenUrl: "https://nid.naver.com/oauth2.0/token",
    profileUrl: "https://openapi.naver.com/v1/nid/me",
    parseProfile(raw) {
      const body = raw as { response?: { id?: string; email?: string; nickname?: string } };
      const r = body.response;
      if (!r?.id) throw new OAuthError("네이버 프로필을 읽지 못했습니다.");
      return { id: r.id, email: r.email, nickname: r.nickname };
    },
  },
};

export interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** 환경변수 이름은 제공자 이름을 대문자로 — KAKAO_CLIENT_ID 등 */
function readConfig(provider: SocialProvider): ProviderConfig | null {
  const p = provider.toUpperCase();
  const clientId = process.env[`${p}_CLIENT_ID`]?.trim();
  const clientSecret = process.env[`${p}_CLIENT_SECRET`]?.trim() ?? "";
  const redirectUri = process.env[`${p}_REDIRECT_URI`]?.trim();

  // 카카오는 시크릿이 선택이라 ID 와 리다이렉트만 있으면 된다
  if (!clientId || !redirectUri) return null;
  if (provider === "naver" && !clientSecret) return null;

  return { clientId, clientSecret, redirectUri };
}

export const isConfigured = (provider: SocialProvider) => readConfig(provider) !== null;

/** 지금 쓸 수 있는 제공자 목록 — 로그인 화면이 버튼을 켤지 정하는 데 쓴다 */
export const configuredProviders = (): SocialProvider[] =>
  (Object.keys(SPECS) as SocialProvider[]).filter(isConfigured);

/**
 * 동의 화면 주소.
 *
 * `state` 는 CSRF 방지용이다 — 콜백으로 돌아온 값이 우리가 보낸 것과 같아야
 * 남이 만든 콜백 요청을 받아들이지 않는다.
 */
export function authorizeUrl(provider: SocialProvider, state: string): string {
  const config = readConfig(provider);
  if (!config) throw new OAuthError(`${provider} 로그인이 설정되지 않았습니다.`);

  const spec = SPECS[provider];
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
  });
  if (spec.scope) params.set("scope", spec.scope);

  return `${spec.authorizeUrl}?${params}`;
}

/** 콜백으로 받은 code 를 프로필로 바꾼다 */
export async function fetchProfile(
  provider: SocialProvider,
  code: string,
): Promise<SocialProfile> {
  const config = readConfig(provider);
  if (!config) throw new OAuthError(`${provider} 로그인이 설정되지 않았습니다.`);

  const spec = SPECS[provider];

  const tokenRes = await fetch(spec.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    }),
  });
  if (!tokenRes.ok) throw new OAuthError(`토큰 교환 실패 (HTTP ${tokenRes.status})`);

  const token = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!token.access_token) throw new OAuthError("토큰을 받지 못했습니다.");

  const profileRes = await fetch(spec.profileUrl, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileRes.ok) throw new OAuthError(`프로필 조회 실패 (HTTP ${profileRes.status})`);

  return spec.parseProfile(await profileRes.json());
}
