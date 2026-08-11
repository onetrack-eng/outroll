import { SignJWT, jwtVerify } from 'jose';
import type { GatedPlatform } from '@/lib/constants';

// Short-lived signed state param for the OAuth round trip — carries who initiated the connect
// flow and which platform/PKCE verifier it's for, so the callback route doesn't have to trust
// the client for that, and doubles as CSRF protection (same purpose as the `state` param in the
// OAuth spec).
//
// Two things can initiate this round trip: an already-authenticated curator connecting an
// account from their dashboard (`kind: 'curator'`), or an applicant verifying the account
// they're applying with before any Curator row exists (`kind: 'application'`, see
// src/app/api/curator/apply/start-verification/route.ts and /apply). completeConnection.ts
// branches on this to know whether to upsert a SocialConnection or fill in a draft
// CuratorApplication.

const STATE_TTL_SECONDS = 60 * 10; // the whole redirect round trip should take under 10 minutes

interface ConnectStateBase {
  platform: GatedPlatform;
  codeVerifier: string;
}

export type ConnectState =
  | (ConnectStateBase & { kind: 'curator'; curatorId: string })
  | (ConnectStateBase & { kind: 'application'; applicationId: string });

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not set. Add it to your .env file.');
  }
  return new TextEncoder().encode(secret);
}

export async function createConnectState(state: ConnectState): Promise<string> {
  return new SignJWT({ ...state })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${STATE_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyConnectState(token: string): Promise<ConnectState | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.platform !== 'string' || typeof payload.codeVerifier !== 'string') {
      return null;
    }
    const platform = payload.platform as GatedPlatform;
    const codeVerifier = payload.codeVerifier;

    if (payload.kind === 'curator' && typeof payload.curatorId === 'string') {
      return { kind: 'curator', platform, codeVerifier, curatorId: payload.curatorId };
    }
    if (payload.kind === 'application' && typeof payload.applicationId === 'string') {
      return { kind: 'application', platform, codeVerifier, applicationId: payload.applicationId };
    }
    return null;
  } catch {
    return null;
  }
}
