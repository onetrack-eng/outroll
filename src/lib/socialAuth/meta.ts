// Facebook Reels verification via Meta's Graph API (Facebook Login for Business + Pages API).
//
// 2026-08-15 correction: an earlier session's CLAUDE.md note claimed pages_show_list/
// pages_read_engagement were deprecated platform-wide (Jan 2025) alongside the Instagram
// scopes. Re-checked directly against Meta's current developer docs — that's wrong. Both
// permissions are still live and documented today. What's actually true: they're not offered
// under the plain consumer "Facebook Login" use case (which is what the original Meta app was
// built with, and which is why they never appeared in that app's App Review picker) — they're
// gated behind **Facebook Login for Business**, which requires the app to be a Business-type
// app with a "Login Configuration" (Configurations tab in the App Dashboard) that bundles the
// permissions and produces a `config_id`. The authorize dialog then takes `config_id` instead
// of `scope`. See CLAUDE.md's Facebook Reels setup checklist for the exact console steps —
// none of that can be done from code, it needs the Meta account holder.
//
// Also fixed here: GRAPH_VERSION was pinned to v19.0, which Meta has since expired (v18/v19
// return hard errors as of 2026) — independent of the permissions issue, this alone would have
// broken every request. Bumped to v25.0.

const GRAPH_VERSION = 'v25.0';
const AUTH_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const TOKEN_URL = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`;
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/api/curator/connections/meta/callback`;
}

// Facebook Login for Business uses a pre-built Login Configuration (config_id) in place of a
// dynamic `scope` param — the configuration itself (created in the App Dashboard) is what
// actually specifies pages_show_list/pages_read_engagement. response_type/override_default_
// response_type are required so the config-based dialog returns a `code` the same way the old
// scope-based flow did, instead of defaulting to a token-in-fragment response.
export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    config_id: process.env.META_LOGIN_CONFIG_ID ?? '',
    response_type: 'code',
    override_default_response_type: 'true',
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
