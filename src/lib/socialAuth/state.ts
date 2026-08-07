import { SignJWT, jwtVerify } from 'jose';
import type { GatedPlatform } from '@/lib/constants';

// Short-lived signed state param for the OAuth round trip — carries which curator/platform
// initiated the connect flow so the callback route doesn't have to trust the client for that,
// and doubles as CSRF protection (same purpose as the `state` param in the OAuth spec).

const STATE_TTL_SECONDS = 60 * 10; // the whole redirect round trip should take under 10 minutes

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not set. Add it to your .env file.');
  }
  return new TextEncoder().encode(secret);
}

export async function createConnectState(
  curatorId: string,
  platform: GatedPlatform,
  codeVerifier: string
): Promise<string> {
  return new SignJWT({ platform, codeVerifier })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(curatorId)
    .setIssuedAt()
    .setExpirationTime(`${STATE_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyConnectState(
  token: string
): Promise<{ curatorId: string; platform: GatedPlatform; codeVerifier: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub || typeof payload.platform !== 'string' || typeof payload.codeVerifier !== 'string') {
      return null;
    }
    return { curatorId: payload.sub, platform: payload.platform as GatedPlatform, codeVerifier: payload.codeVerifier };
  } catch {
    return null;
  }
}
