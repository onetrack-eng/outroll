import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import {
  CURATOR_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from '@/lib/session';

// Node-only auth helpers (route handlers & server components). Password hashing and cookie
// read/write both need APIs that don't exist in the Edge runtime, which is why middleware.ts
// imports lib/session.ts directly instead of this file.

export { CURATOR_SESSION_COOKIE, ADMIN_SESSION_COOKIE, verifySessionToken };
export type { SessionPayload };

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function setCuratorSession(curatorId: string) {
  const token = await createSessionToken({ sub: curatorId, role: 'curator' });
  cookies().set(CURATOR_SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

export async function setAdminSession(adminId: string) {
  const token = await createSessionToken({ sub: adminId, role: 'admin' });
  cookies().set(ADMIN_SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

export function clearCuratorSession() {
  cookies().delete(CURATOR_SESSION_COOKIE);
}

export function clearAdminSession() {
  cookies().delete(ADMIN_SESSION_COOKIE);
}

/** Reads and verifies the curator session cookie from the current request (server components / route handlers). */
export async function getCuratorSession(): Promise<SessionPayload | null> {
  const token = cookies().get(CURATOR_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  return payload?.role === 'curator' ? payload : null;
}

export async function getAdminSession(): Promise<SessionPayload | null> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  return payload?.role === 'admin' ? payload : null;
}
