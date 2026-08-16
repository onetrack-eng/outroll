import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Fixed-window counter backed by Postgres (see RateLimitHit in schema.prisma) rather than a
// separate Redis/Upstash service — this app is low-traffic and already has Postgres as its one
// source of truth, so a new piece of infrastructure isn't worth it for this. windowStart is
// floored to the window size so every request in the same window upserts the same row.
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const hit = await prisma.rateLimitHit.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });
  return hit.count <= limit;
}

// Vercel sets x-forwarded-for on every request; falls back to x-real-ip, then a constant so a
// misconfigured proxy fails closed into one shared bucket rather than disabling rate limiting.
export function clientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
