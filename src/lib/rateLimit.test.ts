import { describe, expect, it, vi, beforeEach } from 'vitest';

const { rateLimitHitUpsert } = vi.hoisted(() => ({
  rateLimitHitUpsert: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    rateLimitHit: {
      upsert: rateLimitHitUpsert,
    },
  },
}));

const { checkRateLimit, clientIp } = await import('./rateLimit');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkRateLimit', () => {
  it('allows a request when the window count is at or under the limit', async () => {
    rateLimitHitUpsert.mockResolvedValue({ count: 3 });
    expect(await checkRateLimit('apply:1.2.3.4', 5, 60_000)).toBe(true);
  });

  it('blocks a request once the window count exceeds the limit', async () => {
    rateLimitHitUpsert.mockResolvedValue({ count: 6 });
    expect(await checkRateLimit('apply:1.2.3.4', 5, 60_000)).toBe(false);
  });

  it('upserts on the same (key, windowStart) so concurrent requests in one window share a counter', async () => {
    rateLimitHitUpsert.mockResolvedValue({ count: 1 });
    await checkRateLimit('checkout:5.6.7.8', 30, 15 * 60 * 1000);
    const call = rateLimitHitUpsert.mock.calls[0][0];
    expect(call.where.key_windowStart.key).toBe('checkout:5.6.7.8');
    expect(call.create).toEqual({ key: 'checkout:5.6.7.8', windowStart: call.where.key_windowStart.windowStart, count: 1 });
    expect(call.update).toEqual({ count: { increment: 1 } });
  });
});

describe('clientIp', () => {
  function reqWithHeaders(headers: Record<string, string>) {
    return { headers: { get: (name: string) => headers[name] ?? null } } as any;
  }

  it('uses the first address in x-forwarded-for', () => {
    expect(clientIp(reqWithHeaders({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    expect(clientIp(reqWithHeaders({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9');
  });

  it('falls back to a constant when neither header is present', () => {
    expect(clientIp(reqWithHeaders({}))).toBe('unknown');
  });
});
