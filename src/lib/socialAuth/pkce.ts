import crypto from 'crypto';

// PKCE (RFC 7636) — TikTok's v2 OAuth requires this even for confidential server-side clients;
// Google and Meta don't need it, but generating it unconditionally in the start route keeps
// the flow uniform across providers.

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateCodeVerifier(): string {
  return base64url(crypto.randomBytes(32));
}

export function codeChallengeFromVerifier(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64url(hash);
}
