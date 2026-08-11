// Platform economics & timing constants — spec sections 3 & 4.

export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? '0.20');

// Business-day windows.
export const CURATOR_ACCEPT_WINDOW_BUSINESS_DAYS = 7;
export const CURATOR_POST_WINDOW_BUSINESS_DAYS = 7;

// Calendar-day dispute/holding window ("one week" per spec section 3, not business days).
export const PAYOUT_HOLD_WINDOW_DAYS = 7;

// Cloud-storage hosts accepted for an artist's asset folder link — any of these over HTTPS,
// not just Google Drive. Add a host here (and to the helper text in AddToCampaignForm.tsx) to
// support another provider.
export const ALLOWED_ASSET_LINK_HOSTS = [
  'drive.google.com',
  'docs.google.com',
  'dropbox.com',
  'onedrive.live.com',
  '1drv.ms',
  'box.com',
  'icloud.com',
] as const;

export function isSecureAssetLink(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return ALLOWED_ASSET_LINK_HOSTS.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
  );
}

// Deliberately just 5 platforms — narrowed 2026-08-11 from an earlier 10-platform list. Twitter/X,
// SoundCloud, Spotify Playlist, and Threads/Twitch were all cut: Twitter/X's API lost its free
// tier in Feb 2026 (see TWITTER_X_COMING_SOON below — shown as "coming soon" instead of dropped
// outright), SoundCloud now requires *us* to hold a paid Artist Pro subscription just to register
// a developer app, Spotify's Extended Quota Mode now requires 250k+ MAU to scale past 5
// authorized curators (unreachable at this stage), and Threads/Twitch were never part of the
// product's actual platform list. Every remaining platform is gated — see GATED_PLATFORMS.
export const PLATFORMS = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'FACEBOOK_REELS', label: 'Facebook Reels' },
  { value: 'YOUTUBE_SHORTS', label: 'YouTube Shorts' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'SNAPCHAT', label: 'Snapchat' },
] as const;

export type PlatformValue = (typeof PLATFORMS)[number]['value'];

// Not listable yet — shown as a disabled "coming soon" row on the curator dashboard, not part of
// PLATFORMS (so it can't be selected, filtered on, or listed against). Revisit once there's
// enough curator volume to justify X's pay-per-use API costs (a real but small ongoing cost —
// see the PLATFORMS comment above).
export const TWITTER_X_COMING_SOON = { value: 'TWITTER_X', label: 'Twitter/X' } as const;

export function platformLabel(value: string): string {
  if (value === TWITTER_X_COMING_SOON.value) return TWITTER_X_COMING_SOON.label;
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

// Platforms with a real, reachable OAuth path for proving account ownership — see
// src/lib/socialAuth/. Listing on one of these requires the curator to connect the account
// first; see /api/curator/connections/[platform]/*. As of 2026-08-11 this is every listable
// platform (see PLATFORMS above) — Snapchat's Login Kit joined the original four. Note Snapchat's
// OAuth proves ownership but has no official follower-count API, so SocialConnection.followerCount
// is nullable and Snapchat connections carry a null there — see completeConnection.ts.
export const GATED_PLATFORMS = ['INSTAGRAM', 'FACEBOOK_REELS', 'TIKTOK', 'YOUTUBE_SHORTS', 'SNAPCHAT'] as const;

export type GatedPlatform = (typeof GATED_PLATFORMS)[number];

export function isGatedPlatform(platform: string): platform is GatedPlatform {
  return (GATED_PLATFORMS as readonly string[]).includes(platform);
}

// Canonical profile URL base for a verified handle, keyed by gated platform. Used both to fill
// CuratorApplication.profileUrl on OAuth verification and, for platforms with no follower-count
// API (Snapchat), to link the "Verified" badge straight to the real profile so a buyer can check
// the count themselves — see verifiedFollowerCounts.ts.
export const PROFILE_URL_BASE: Record<GatedPlatform, string> = {
  INSTAGRAM: 'https://instagram.com/',
  FACEBOOK_REELS: 'https://facebook.com/',
  TIKTOK: 'https://tiktok.com/@',
  YOUTUBE_SHORTS: 'https://youtube.com/@',
  SNAPCHAT: 'https://snapchat.com/add/',
};

export const GENRES = [
  { value: 'POP', label: 'Pop' },
  { value: 'HIP_HOP_RAP', label: 'Hip-Hop/Rap' },
  { value: 'RNB', label: 'R&B' },
  { value: 'ROCK', label: 'Rock' },
  { value: 'COUNTRY', label: 'Country' },
  { value: 'ELECTRONIC_DANCE', label: 'Electronic/Dance' },
  { value: 'LATIN', label: 'Latin' },
  { value: 'INDIE_ALTERNATIVE', label: 'Indie/Alternative' },
  { value: 'KPOP', label: 'K-Pop' },
  { value: 'AFROBEATS', label: 'Afrobeats' },
  { value: 'REGGAE', label: 'Reggae' },
  { value: 'JAZZ', label: 'Jazz' },
  { value: 'METAL', label: 'Metal' },
  { value: 'FOLK', label: 'Folk' },
  { value: 'CHRISTIAN_GOSPEL', label: 'Christian/Gospel' },
  { value: 'OTHER', label: 'Other' },
] as const;

export type GenreValue = (typeof GENRES)[number]['value'];

export function genreLabel(value: string): string {
  return GENRES.find((g) => g.value === value)?.label ?? value;
}

// Curator's listed price -> what the artist is charged, in integer cents throughout.
export function computeCharge(priceCents: number) {
  const platformFeeCents = Math.round(priceCents * PLATFORM_FEE_PERCENT);
  const totalChargeCents = priceCents + platformFeeCents;
  return { priceCents, platformFeeCents, totalChargeCents };
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}
