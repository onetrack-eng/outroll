import type { GatedPlatform } from '@/lib/constants';
import * as google from './google';
import * as tiktok from './tiktok';
import * as meta from './meta';

type Provider = 'google' | 'tiktok' | 'meta';

export const PROVIDER_FOR_PLATFORM: Record<GatedPlatform, Provider> = {
  YOUTUBE_SHORTS: 'google',
  TIKTOK: 'tiktok',
  INSTAGRAM: 'meta',
  FACEBOOK_REELS: 'meta',
};

// Route segment used in /api/curator/connections/[platform]/start. Each provider module's
// redirectUri() hardcodes the matching callback path, since OAuth apps require an exact,
// pre-registered redirect URI — these two must stay in sync.
export const START_ROUTE_SEGMENT: Record<GatedPlatform, string> = {
  YOUTUBE_SHORTS: 'youtube_shorts',
  TIKTOK: 'tiktok',
  INSTAGRAM: 'instagram',
  FACEBOOK_REELS: 'facebook_reels',
};

const ROUTE_SEGMENT_TO_PLATFORM: Record<string, GatedPlatform> = Object.fromEntries(
  Object.entries(START_ROUTE_SEGMENT).map(([platform, segment]) => [segment, platform as GatedPlatform])
);

export function platformForStartRoute(segment: string): GatedPlatform | null {
  return ROUTE_SEGMENT_TO_PLATFORM[segment] ?? null;
}

// codeVerifier is only used by the TikTok branch (PKCE); Google and Meta ignore it.
export function getAuthUrl(platform: GatedPlatform, state: string, codeVerifier: string): string {
  switch (PROVIDER_FOR_PLATFORM[platform]) {
    case 'google':
      return google.getAuthUrl(state);
    case 'tiktok':
      return tiktok.getAuthUrl(state, codeVerifier);
    case 'meta':
      return meta.getAuthUrl(state);
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
  }
}

export function fetchProfile(platform: GatedPlatform, accessToken: string) {
  switch (PROVIDER_FOR_PLATFORM[platform]) {
    case 'google':
      return google.fetchProfile(accessToken);
    case 'tiktok':
      return tiktok.fetchProfile(accessToken);
    case 'meta':
      return meta.fetchProfile(accessToken, platform);
  }
}
