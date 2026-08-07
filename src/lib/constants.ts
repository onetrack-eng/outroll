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

export const PLATFORMS = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'YOUTUBE_SHORTS', label: 'YouTube Shorts' },
  { value: 'FACEBOOK_REELS', label: 'Facebook Reels' },
  { value: 'TWITTER_X', label: 'Twitter/X' },
  { value: 'SNAPCHAT', label: 'Snapchat' },
  { value: 'THREADS', label: 'Threads' },
  { value: 'TWITCH', label: 'Twitch' },
  { value: 'SOUNDCLOUD', label: 'SoundCloud' },
  { value: 'SPOTIFY_PLAYLIST', label: 'Spotify Playlist' },
] as const;

export type PlatformValue = (typeof PLATFORMS)[number]['value'];

export function platformLabel(value: string): string {
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

// Platforms with a real, reachable follower-count API (no paid tier, no closed developer
// registration — see src/lib/socialAuth/). Listing on one of these requires the curator to
// connect the account first; see /api/curator/connections/[platform]/*. The other 6 platforms
// stay self-reported for now.
export const GATED_PLATFORMS = ['INSTAGRAM', 'FACEBOOK_REELS', 'TIKTOK', 'YOUTUBE_SHORTS'] as const;

export type GatedPlatform = (typeof GATED_PLATFORMS)[number];

export function isGatedPlatform(platform: string): platform is GatedPlatform {
  return (GATED_PLATFORMS as readonly string[]).includes(platform);
}

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
