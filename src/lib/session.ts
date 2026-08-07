import { SignJWT, jwtVerify } from 'jose';

// Edge-safe session primitives — no `next/headers`, no bcrypt. This file is imported by
// middleware.ts (Edge runtime), which can't use `next/headers` (that's Node-only, for Server
// Components/route handlers). lib/auth.ts wraps this with the cookie read/write helpers for
// use in route handlers and server components.

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not set. Add it to your .env file.');
  }
  return new TextEncoder().encode(secret);
}

export type SessionRole = 'curator' | 'admin';

export interface SessionPayload {
  sub: string; // user id
  role: SessionRole;
}

export const CURATOR_SESSION_COOKIE = 'pfm_curator_session';
export const ADMIN_SESSION_COOKIE = 'pfm_admin_session';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub || (payload.role !== 'curator' && payload.role !== 'admin')) {
      return null;
    }
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
