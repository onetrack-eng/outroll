import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  curatorFindUnique,
  curatorCreate,
  applicationFindUnique,
  applicationFindFirst,
  applicationUpdate,
  socialConnectionCreate,
} = vi.hoisted(() => ({
  curatorFindUnique: vi.fn(),
  curatorCreate: vi.fn(),
  applicationFindUnique: vi.fn(),
  applicationFindFirst: vi.fn(),
  applicationUpdate: vi.fn(),
  socialConnectionCreate: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    curator: { findUnique: curatorFindUnique, create: curatorCreate },
    curatorApplication: { findUnique: applicationFindUnique, findFirst: applicationFindFirst, update: applicationUpdate },
    socialConnection: { create: socialConnectionCreate },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        curator: { create: curatorCreate },
        curatorApplication: { update: applicationUpdate },
        socialConnection: { create: socialConnectionCreate },
      }),
  },
}));

vi.mock('@/lib/auth', () => ({
  hashPassword: async () => 'hashed',
  setCuratorSession: async () => {},
}));

const { POST } = await import('./route');

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const approvedApplication = {
  id: 'app-1',
  status: 'APPROVED',
  signupTokenUsed: false,
  email: 'artist@example.com',
  platform: 'INSTAGRAM',
  genre: 'POP',
  followerCount: 1000,
  profileUrl: 'https://instagram.com/artist',
  verifiedProfilePhotoDataUrl: null,
  verifiedExternalUserId: null,
};

const validBody = {
  token: 'signup-token',
  username: 'coolcurator',
  password: 'a-real-password',
  displayName: 'Cool Curator',
};

beforeEach(() => {
  curatorFindUnique.mockReset();
  curatorFindUnique.mockResolvedValue(null);
  curatorCreate.mockReset();
  curatorCreate.mockResolvedValue({ id: 'curator-1' });
  applicationFindUnique.mockReset();
  applicationFindUnique.mockResolvedValue(approvedApplication);
  applicationFindFirst.mockReset();
  applicationFindFirst.mockResolvedValue(null);
  applicationUpdate.mockReset();
  socialConnectionCreate.mockReset();
});

describe('POST /api/curator/signup', () => {
  it('rejects a username already taken by a real Curator', async () => {
    curatorFindUnique.mockResolvedValue({ id: 'existing-curator' });

    const res = await POST(fakeRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('That username is already taken.');
    expect(curatorCreate).not.toHaveBeenCalled();
  });

  it('rejects a username reserved by a different live application', async () => {
    applicationFindFirst.mockResolvedValue({ id: 'someone-elses-application' });

    const res = await POST(fakeRequest(validBody));

    expect(res.status).toBe(409);
    expect(curatorCreate).not.toHaveBeenCalled();
  });

  it('allows the applicant to re-enter their own proposedUsername (excluded from the reservation check)', async () => {
    // The reservation-check mock (applicationFindFirst) already excludes this application via
    // the `id: { not: application.id }` clause built into isUsernameAvailable — simulate that by
    // asserting it was called with the exclusion, then letting it resolve to null (available).
    const res = await POST(fakeRequest(validBody));

    expect(applicationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: 'app-1' } }) })
    );
    expect(res.status).toBe(200);
    expect(curatorCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ username: 'coolcurator', applicationId: 'app-1' }),
    });
  });

  it('rejects an invalid or already-used signup link', async () => {
    applicationFindUnique.mockResolvedValue(null);

    const res = await POST(fakeRequest(validBody));

    expect(res.status).toBe(400);
    expect(curatorCreate).not.toHaveBeenCalled();
  });
});
