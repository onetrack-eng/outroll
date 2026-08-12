import { randomBytes } from 'crypto';

// "Forgot password" reset link for curators (src/app/api/curator/{forgot,reset}-password).
// Unlike Campaign.magicLinkToken, this is single-use and short-lived — see the schema comment
// on Curator.passwordResetToken. High-entropy (144 bits) so it's safe to email as a bare link.
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function generatePasswordResetToken(): string {
  return randomBytes(18).toString('base64url');
}

export function passwordResetUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/curator/reset-password/${token}`;
}
