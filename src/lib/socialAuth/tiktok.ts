// TikTok verification via TikTok Login Kit. Requires a TikTok for Developers app with Login Kit
// added and the `user.info.stats` scope approved — that approval is the slow part (see
// CLAUDE.md). TIKTOK_CLIENT_KEY/SECRET are placeholders until then. TikTok's v2 authorize
// endpoint requires PKCE even for confidential clients — confirmed by testing against the real
// endpoint, which rejects requests missing `code_challenge` with a clear error.

import { codeChallengeFromVerifier } from './pkce';

const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/api/curator/connections/tiktok/callback`;
}

export function getAuthUrl(state: string, codeVerifier: string): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'user.info.basic,user.info.stats',
    state,
    code_challenge: codeChallengeFromVerifier(codeVerifier),
    code_challenge_method: 'S256',
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string, codeVerifier: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
      client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(),
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) {
    throw new Error(`TikTok token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string | undefined) ?? undefined,
    expiresInSeconds: data.expires_in as number | undefined,
  };
}

export async function fetchProfile(accessToken: string) {
  const params = new URLSearchParams({ fields: 'open_id,username,follower_count' });
  const res = await fetch(`${USER_INFO_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`TikTok user info lookup failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const user = data.data?.user;
  if (!user) {
    throw new Error('No TikTok profile returned for this account.');
  }
  return {
    externalUserId: user.open_id as string,
    handle: user.username as string | undefined,
    followerCount: Number(user.follower_count ?? 0),
  };
}
