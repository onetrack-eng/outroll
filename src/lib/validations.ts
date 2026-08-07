import { z } from 'zod';
import { GATED_PLATFORMS, isSecureAssetLink } from '@/lib/constants';

export const platformEnum = z.enum([
  'INSTAGRAM',
  'TIKTOK',
  'YOUTUBE_SHORTS',
  'FACEBOOK_REELS',
  'TWITTER_X',
  'SNAPCHAT',
  'THREADS',
  'TWITCH',
  'SOUNDCLOUD',
  'SPOTIFY_PLAYLIST',
]);

export const genreEnum = z.enum([
  'POP',
  'HIP_HOP_RAP',
  'RNB',
  'ROCK',
  'COUNTRY',
  'ELECTRONIC_DANCE',
  'LATIN',
  'INDIE_ALTERNATIVE',
  'KPOP',
  'AFROBEATS',
  'REGGAE',
  'JAZZ',
  'METAL',
  'FOLK',
  'CHRISTIAN_GOSPEL',
  'OTHER',
]);

export const curatorApplicationSchema = z.object({
  email: z.string().email(),
  proposedUsername: z.string().min(3).max(24).regex(/^[a-z0-9_]+$/i, 'Letters, numbers, underscores only'),
  platform: platformEnum,
  genre: genreEnum,
  followerCount: z.coerce.number().int().min(0),
  profileUrl: z.string().url(),
  message: z.string().min(20).max(2000),
});

export const listingCreateSchema = z.object({
  platform: platformEnum,
  genre: genreEnum,
  priceCents: z.coerce.number().int().min(500, 'Minimum price is $5.00'),
});

export const curatorSignupSchema = z.object({
  token: z.string().min(1),
  username: z.string().min(3).max(24).regex(/^[a-z0-9_]+$/i),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
  listings: z
    .array(
      z.object({
        platform: platformEnum,
        priceCents: z.coerce.number().int().min(500, 'Minimum price is $5.00'),
      })
    )
    .max(10)
    .refine(
      (listings) => new Set(listings.map((l) => l.platform)).size === listings.length,
      'Each platform can only be listed once'
    )
    .refine(
      // Verification requires an authenticated curator (for the OAuth state token), which
      // doesn't exist yet at signup time — gated platforms must be connected afterward from
      // the dashboard, see /api/curator/connections/[platform]/start.
      (listings) => listings.every((l) => !(GATED_PLATFORMS as readonly string[]).includes(l.platform)),
      'Instagram, Facebook Reels, TikTok, and YouTube Shorts require verification after signup'
    )
    .default([]),
});

export const pitchSchema = z.object({
  listingId: z.string().min(1),
  assetLink: z
    .string()
    .url('Must be a valid link')
    .refine(isSecureAssetLink, 'Must be a secure (https) link from Google Drive, Dropbox, OneDrive, Box, or iCloud'),
  narrative: z.string().min(10).max(500),
  context: z.string().max(3000).optional().default(''),
});

export const checkoutSchema = z.object({
  artistEmail: z.string().email(),
  artistName: z.string().min(1).max(120).optional(),
  pitches: z.array(pitchSchema).min(1, 'Add at least one curator to your campaign'),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const disputeSchema = z.object({
  reason: z.string().min(20, 'Please provide a bit more detail').max(3000),
});

export const postLinkSchema = z.object({
  postUrl: z.string().url('Must be a valid link'),
});
