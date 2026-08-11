// Snapchat verification via Login Kit — a standard, self-serve OAuth 2.0 flow (Snap Developer
// Portal, no paid tier, no closed approval process — confirmed 2026-08-11 against Snap's current
// docs). Unlike Google/TikTok/Meta/Instagram, Login Kit has no official follower/subscriber-count
// API: it only proves the curator controls the account (display name + a stable external ID), so
// fetchProfile's followerCount is always undefined and SocialConnection.followerCount is nullable
// to match (see completeConnection.ts and the schema comment on that column).
// SNAPCHAT_CLIENT_ID/SECRET are placeholders until a real app is registered — see CLAUDE.md.

const AUTH_URL = 'https://accounts.snapchat.com/accounts/oauth2/auth';
const TOKEN_URL = 'https://accounts.snapchat.com/accounts/oauth2/token';
const ME_URL = 'https://kit.snapchat.com/v1/me';

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/api/curator/connections/snapchat/callback`;
}

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SNAPCHAT_CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: [
      'https://auth.snapchat.com/oauth2/api/user.display_name',
      'https://auth.snapchat.com/oauth2/api/user.external_id',
    ].join(' '),
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SNAPCHAT_CLIENT_ID ?? '',
      client_secret: process.env.SNAPCHAT_CLIENT_SECRET ?? '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Snapchat token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string | undefined) ?? undefined,
    expiresInSeconds: data.expires_in as number | undefined,
  };
}

// Same expiring-signed-URL concern as Instagram's profile photo — download and re-encode
// immediately rather than storing the provider's URL directly. See instagram.ts's toDataUrl.
async function toDataUrl(imageUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return undefined;
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return undefined;
  }
}

export async function fetchProfile(accessToken: string) {
  const res = await fetch(ME_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: '{me{displayName bitmoji{avatar} externalId}}' }),
  });
  if (!res.ok) {
    throw new Error(`Snapchat profile lookup failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const me = data.data?.me;
  if (!me) {
    throw new Error('No Snapchat profile returned for this account.');
  }
  const profilePhotoDataUrl = me.bitmoji?.avatar ? await toDataUrl(me.bitmoji.avatar as string) : undefined;
  return {
    externalUserId: me.externalId as string,
    handle: me.displayName as string | undefined,
    // No official follower-count API — see the file header comment.
    followerCount: undefined as number | undefined,
    profilePhotoDataUrl,
  };
}
