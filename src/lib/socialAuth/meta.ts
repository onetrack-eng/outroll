// Facebook Reels verification via Meta's Graph API (Facebook Login + Pages API). Requires a
// Meta Developer app with Facebook Login added, in Live mode with App Review approval for
// `pages_show_list` and `pages_read_engagement` — see CLAUDE.md for the full checklist.
//
// Instagram used to share this same module/app, but no longer does — Meta deprecated
// pages_show_list/pages_read_engagement/instagram_basic (the scopes Instagram verification
// used to run on) January 27, 2025. Instagram now goes through instagram.ts's "Instagram API
// with Instagram Login" instead, a separate app/provider that doesn't need a Facebook Page at
// all. Facebook Reels still needs this older path since its follower count is a Page metric,
// not an Instagram one — this hasn't been re-verified against a real Meta app since the
// deprecation, unlike Instagram (see CLAUDE.md's "Social account verification" section).

const GRAPH_VERSION = 'v19.0';
const AUTH_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const TOKEN_URL = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`;
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/api/curator/connections/meta/callback`;
}

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'pages_show_list,pages_read_engagement',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_CLIENT_ID ?? '',
    client_secret: process.env.META_CLIENT_SECRET ?? '',
    redirect_uri: redirectUri(),
    code,
  });
  const res = await fetch(`${TOKEN_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Meta token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: undefined, // Meta uses long-lived user tokens instead of refresh tokens
    expiresInSeconds: data.expires_in as number | undefined,
  };
}

// Picks the curator's first connected Page — a curator managing multiple Pages would need a
// page-picker UI to choose which one this listing represents; out of scope for now.
async function firstPage(accessToken: string) {
  const params = new URLSearchParams({
    fields: 'id,name,access_token,followers_count',
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/me/accounts?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Meta pages lookup failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const page = data.data?.[0];
  if (!page) {
    throw new Error('No Facebook Page found on this account. Connect a Page to verify.');
  }
  return page as { id: string; name: string; access_token: string; followers_count?: number };
}

export async function fetchProfile(accessToken: string) {
  const page = await firstPage(accessToken);
  return {
    externalUserId: page.id,
    handle: page.name,
    followerCount: Number(page.followers_count ?? 0),
    // Only Instagram's fetchProfile downloads a display photo today — see instagram.ts.
    profilePhotoDataUrl: undefined as string | undefined,
  };
}
