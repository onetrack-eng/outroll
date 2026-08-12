import { z } from 'zod';
import { isSecureAssetLink } from '@/lib/constants';

// Mirrors PLATFORMS in @/lib/constants — the platforms curators can actually list on today.
// Deliberately narrower than the full Prisma Platform enum (which still has TWITTER_X and a few
// retired values for backward compatibility with existing rows) so the API rejects attempts to
// create a listing on a platform that isn't offered, not just hides it from the UI.
export const platformEnum = z.enum(['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS', 'FACEBOOK_REELS', 'SNAPCHAT']);

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

// Every curator application requires connecting Instagram via OAuth — no self-reported
// follower count, no platform choice (see /apply and start-verification/route.ts). Follower
// count and profile URL are deliberately absent here; they only ever come from the verified
// Instagram profile once OAuth completes (see completeConnection.ts), never from user input.
export const applicationDraftSchema = z.object({
  email: z.string().email(),
  proposedUsername: z.string().min(3).max(24).regex(/^[a-z0-9_]+$/i, 'Letters, numbers, underscores only'),
  genre: genreEnum,
  message: z.string().min(20).max(2000),
});

export const listingCreateSchema = z.object({
  platform: platformEnum,
  genre: genreEnum,
  priceCents: z.coerce.number().int().min(500, 'Minimum price is $5.00'),
});

export const listingUpdateSchema = z
  .object({
    priceCents: z.coerce.number().int().min(500, 'Minimum price is $5.00').optional(),
    isPaused: z.boolean().optional(),
  })
  .refine((data) => data.priceCents !== undefined || data.isPaused !== undefined, {
    message: 'Nothing to update',
  });

// No `listings` field — every platform now requires OAuth verification (see GATED_PLATFORMS in
// @/lib/constants), which needs an authenticated curator to exist first, so listings are only
// ever created after signup from the dashboard's "Connect account" flow.
export const curatorSignupSchema = z.object({
  token: z.string().min(1),
  username: z.string().min(3).max(24).regex(/^[a-z0-9_]+$/i),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
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

// Admin login stays username-based — only curator login switched to email (2026-08-11).
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const curatorLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const disputeSchema = z.object({
  reason: z.string().min(20, 'Please provide a bit more detail').max(3000),
});

export const postLinkSchema = z.object({
  postUrl: z.string().url('Must be a valid link'),
});
