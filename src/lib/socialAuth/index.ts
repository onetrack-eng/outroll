import type { GatedPlatform } from '@/lib/constants';
import * as google from './google';
import * as tiktok from './tiktok';
import * as meta from './meta';
import * as instagram from './instagram';
import * as snapchat from './snapchat';

type Provider = 'google' | 'tiktok' | 'meta' | 'instagram' | 'snapchat';

// INSTAGRAM uses its own dedicated 'instagram' provider (Instagram API with Instagram Login —
// see instagram.ts for why), not the shared Meta/Facebook Login app that FACEBOOK_REELS still
// uses. They used to share one provider before Meta deprecated the scopes that made that work.
export const PROVIDER_FOR_PLATFORM: Record<GatedPlatform, Provider> = {
  YOUTUBE_SHORTS: 'google',
  TIKTOK: 'tiktok',
  INSTAGRAM: 'instagram',
  FACEBOOK_REELS: 'meta',
  SNAPCHAT: 'snapchat',
};

// Route segment used in /api/curator/connections/[platform]/start. Each provider module's
// redirectUri() hardcodes the matching callback path, since OAuth apps require an exact,
// pre-registered redirect URI — these two must stay in sync.
export const START_ROUTE_SEGMENT: Record<GatedPlatform, string> = {
  YOUTUBE_SHORTS: 'youtube_shorts',
  TIKTOK: 'tiktok',
  INSTAGRAM: 'instagram',
  FACEBOOK_REELS: 'facebook_reels',
  SNAPCHAT: 'snapchat',
};

const ROUTE_SEGMENT_TO_PLATFORM: Record<string, GatedPlatform> = Object.fromEntries(
  Object.entries(START_ROUTE_SEGMENT).map(([platform, segment]) => [segment, platform as GatedPlatform])
);

export function platformForStartRoute(segment: string): GatedPlatform | null {
  return ROUTE_SEGMENT_TO_PLATFORM[segment] ?? null;
}

// codeVerifier is only used by the TikTok branch (PKCE); Google, Meta, and Instagram ignore it.
export function getAuthUrl(platform: GatedPlatform, state: string, codeVerifier: string): string {
  switch (PROVIDER_FOR_PLATFORM[platform]) {
    case 'google':
      return google.getAuthUrl(state);
    case 'tiktok':
      return tiktok.getAuthUrl(state, codeVerifier);
    case 'meta':
      return meta.getAuthUrl(state);
    case 'instagram':
      return instagram.getAuthUrl(state);
    case 'snapchat':
      return snapchat.getAuthUrl(state);
  }
}

export function exchangeCode(platform: GatedPlatform, code: string, codeVerifier: string) {
  switch (PROVIDER_FOR_PLATFORM[platform]) {
    case 'google':
      return google.exchangeCode(code);
    case 'tiktok':
      return tiktok.exchangeCode(code, codeVerifier);
    case 'meta':
      return meta.exchangeCode(code);
    case 'instagram':
      return instagram.exchangeCode(code);
    case 'snapchat':
      return snapchat.exchangeCode(code);
  }
}

export function fetchProfile(platform: GatedPlatform, accessToken: string) {
  switch (PROVIDER_FOR_PLATFORM[platform]) {
    case 'google':
      return google.fetchProfile(accessToken);
    case 'tiktok':
      return tiktok.fetchProfile(accessToken);
    case 'meta':
      return meta.fetchProfile(accessToken);
    case 'instagram':
      return instagram.fetchProfile(accessToken);
    case 'snapchat':
      return snapchat.fetchProfile(accessToken);
  }
}
