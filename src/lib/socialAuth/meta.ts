import type { GatedPlatform } from '@/lib/constants';

// Instagram + Facebook Reels verification via Meta's Graph API. Requires a Meta Developer app
// with Facebook Login added, in Live mode with App Review approval for `pages_show_list`,
// `pages_read_engagement`, and `instagram_basic` — see CLAUDE.md for the full checklist. The
// curator's Instagram must be a Business/Creator account linked to a Facebook Page (Meta
// removed personal-account follower access with the old Basic Display API). One Meta app
// covers both platforms; only the follower-count lookup differs.

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
    scope: 'pages_show_list,pages_read_engagement,instagram_basic',
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
    fields: 'id,name,access_token,followers_count,instagram_business_account',
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
  return page as {
    id: string;
    name: string;
    access_token: string;
    followers_count?: number;
    instagram_business_account?: { id: string };
  };
}

export async function fetchProfile(accessToken: string, platform: GatedPlatform) {
  const page = await firstPage(accessToken);

  if (platform === 'FACEBOOK_REELS') {
    return {
      externalUserId: page.id,
      handle: page.name,
      followerCount: Number(page.followers_count ?? 0),
    };
  }

  // INSTAGRAM
  const igAccountId = page.instagram_business_account?.id;
  if (!igAccountId) {
    throw new Error(
      'This Facebook Page has no linked Instagram Business/Creator account. Link one in Meta Business Suite first.'
    );
  }
  const params = new URLSearchParams({
    fields: 'username,followers_count',
    access_token: page.access_token,
  });
  const res = await fetch(`${GRAPH_BASE}/${igAccountId}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Instagram account lookup failed: ${res.status} ${await res.text()}`);
  }
  const ig = await res.json();
  return {
    externalUserId: igAccountId,
    handle: ig.username as string | undefined,
    followerCount: Number(ig.followers_count ?? 0),
  };
}
