import { randomBytes } from 'crypto';

// Artists never set a password — the emailed link *is* the credential (spec section 2), and
// it's reused across every status-update email for the life of the campaign. So unlike a
// one-time reset token, we store it directly (see Campaign.magicLinkToken) rather than hashed —
// we need to be able to reconstruct the same URL later. It's high-entropy (144 bits) so this
// carries the same trust model as e.g. a Stripe customer portal link.

export function generateMagicLinkToken(): string {
  return randomBytes(18).toString('base64url');
}

export function magicLinkUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/dashboard/${token}`;
}
