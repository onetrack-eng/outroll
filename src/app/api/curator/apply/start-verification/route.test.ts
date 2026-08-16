import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const { curatorFindUnique, applicationFindFirst, applicationCreate, rateLimitHitUpsert } = vi.hoisted(() => ({
  curatorFindUnique: vi.fn(),
  applicationFindFirst: vi.fn(),
  applicationCreate: vi.fn(),
  rateLimitHitUpsert: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    curator: { findUnique: curatorFindUnique },
    curatorApplication: { findFirst: applicationFindFirst, create: applicationCreate },
    rateLimitHit: { upsert: rateLimitHitUpsert },
  },
}));

const { getAuthUrl } = vi.hoisted(() => ({ getAuthUrl: vi.fn() }));
vi.mock('@/lib/socialAuth', () => ({ getAuthUrl }));

const { createConnectState } = vi.hoisted(() => ({ createConnectState: vi.fn() }));
vi.mock('@/lib/socialAuth/state', () => ({ createConnectState }));

vi.mock('@/lib/socialAuth/pkce', () => ({ generateCodeVerifier: () => 'verifier' }));

const { POST } = await import('./route');

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body, headers: { get: () => null } } as unknown as NextRequest;
}

const validBody = {
  email: 'artist@example.com',
  proposedUsername: 'coolcurator',
  genre: 'POP',
  message: 'A real message about my audience, long enough to pass validation.',
};

beforeEach(() => {
  curatorFindUnique.mockReset();
  curatorFindUnique.mockResolvedValue(null);
  applicationFindFirst.mockReset();
  applicationFindFirst.mockResolvedValue(null);
  applicationCreate.mockReset();
  applicationCreate.mockResolvedValue({ id: 'app-1' });
  rateLimitHitUpsert.mockReset();
  rateLimitHitUpsert.mockResolvedValue({ count: 1 });
  getAuthUrl.mockReset();
  getAuthUrl.mockReturnValue('https://instagram.example/oauth');
  createConnectState.mockReset();
  createConnectState.mockResolvedValue('signed-state');
});

describe('POST /api/curator/apply/start-verification', () => {
  it('rejects a username already taken by a real Curator, before creating anything', async () => {
    curatorFindUnique.mockResolvedValue({ id: 'existing-curator' });

    const res = await POST(fakeRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('That username is already taken.');
    expect(applicationCreate).not.toHaveBeenCalled();
  });

  it('rejects a username reserved by another pending application', async () => {
    applicationFindFirst.mockResolvedValue({ id: 'other-application' });

    const res = await POST(fakeRequest(validBody));

    expect(res.status).toBe(409);
    expect(applicationCreate).not.toHaveBeenCalled();
  });

  it('creates the draft application and redirects into OAuth when the username is free', async () => {
    const res = await POST(fakeRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(applicationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ proposedUsername: 'coolcurator', oauthPending: true }),
    });
    expect(body.redirectUrl).toBe('https://instagram.example/oauth');
  });
});
