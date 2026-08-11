// Instagram verification via "Instagram API with Instagram Login" (Meta's current, non-deprecated
// path as of this writing). Deliberately NOT the older Facebook Login + Pages API route (which
// used pages_show_list/pages_read_engagement/instagram_basic) -- those scopes were deprecated
// January 27, 2025 and are no longer requestable at all, confirmed by hitting this live against
// a real Meta app: they don't appear in App Review's permission picker, and no "use case" that
// bundles them is addable to an app once Facebook Login has been chosen as the primary use case.
// This path authenticates the Instagram Business/Creator account directly and does NOT require a
// linked Facebook Page — genuinely simpler for what this app needs (just the account + follower
// count). Facebook Reels still goes through meta.ts's older Facebook Login + Pages path, since
// that's a Page metric, not an Instagram one -- separately still-untested/not fixed by this.
//
// Uses its own app credentials (INSTAGRAM_CLIENT_ID/SECRET) — Meta issues a distinct "Instagram
// App ID"/"Instagram App Secret" for this login path, shown under the app's Instagram > API
// setup with Instagram Login section, not the same as the Facebook Login app's META_CLIENT_ID.

const AUTH_URL = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const LONG_LIVED_TOKEN_URL = 'https://graph.instagram.com/access_token';
const GRAPH_BASE = 'https://graph.instagram.com/v22.0';

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/api/curator/connections/instagram/callback`;
}

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'instagram_business_basic',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID ?? '',
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET ?? '',
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(),
      code,
    }),
  });
  if (!res.ok) {
    throw new Error(`Instagram token exchange failed: ${res.status} ${await res.text()}`);
  }
  const shortLived = await res.json();

  // Immediately upgrade to a long-lived (60-day) token -- the short-lived one from the code
  // exchange above is only good for about an hour.
  const longLivedParams = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: process.env.INSTAGRAM_CLIENT_SECRET ?? '',
    access_token: shortLived.access_token,
  });
  const longLivedRes = await fetch(`${LONG_LIVED_TOKEN_URL}?${longLivedParams.toString()}`);
  if (!longLivedRes.ok) {
    throw new Error(`Instagram long-lived token exchange failed: ${longLivedRes.status} ${await longLivedRes.text()}`);
  }
  const longLived = await longLivedRes.json();

  return {
    accessToken: longLived.access_token as string,
    refreshToken: undefined, // long-lived tokens are refreshed by re-exchanging themselves, not via a separate refresh token
    expiresInSeconds: longLived.expires_in as number | undefined,
  };
}

export async function fetchProfile(accessToken: string) {
  const params = new URLSearchParams({
    fields: 'id,username,followers_count',
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/me?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Instagram profile lookup failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    externalUserId: data.id as string,
    handle: data.username as string | undefined,
    followerCount: Number(data.followers_count ?? 0),
  };
}
