// YouTube verification via Google OAuth. Requires a Google Cloud project with the YouTube Data
// API v3 enabled and an OAuth 2.0 Client (Web application type) — see CLAUDE.md for the setup
// checklist. GOOGLE_CLIENT_ID/SECRET are placeholders until that's done; connect attempts will
// fail with a clear error rather than silently misbehaving.

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/api/curator/connections/youtube_shorts/callback`;
}

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string | undefined) ?? undefined,
    expiresInSeconds: data.expires_in as number | undefined,
  };
}

export async function fetchProfile(accessToken: string) {
  const params = new URLSearchParams({ part: 'snippet,statistics', mine: 'true' });
  const res = await fetch(`${CHANNELS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`YouTube channels lookup failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const channel = data.items?.[0];
  if (!channel) {
    throw new Error('No YouTube channel found on this Google account.');
  }
  return {
    externalUserId: channel.id as string,
    handle: channel.snippet?.title as string | undefined,
    followerCount: Number(channel.statistics?.subscriberCount ?? 0),
  };
}
