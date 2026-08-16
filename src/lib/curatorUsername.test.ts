import { beforeEach, describe, expect, it, vi } from 'vitest';

const { curatorFindUnique, applicationFindFirst } = vi.hoisted(() => ({
  curatorFindUnique: vi.fn(),
  applicationFindFirst: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    curator: { findUnique: curatorFindUnique },
    curatorApplication: { findFirst: applicationFindFirst },
  },
}));

const { isUsernameAvailable } = await import('./curatorUsername');

beforeEach(() => {
  curatorFindUnique.mockReset();
  applicationFindFirst.mockReset();
});

describe('isUsernameAvailable', () => {
  it('is unavailable when a real Curator already has it', async () => {
    curatorFindUnique.mockResolvedValue({ id: 'curator-1' });
    applicationFindFirst.mockResolvedValue(null);

    expect(await isUsernameAvailable('taken')).toBe(false);
  });

  it('is unavailable when another live application reserves it', async () => {
    curatorFindUnique.mockResolvedValue(null);
    applicationFindFirst.mockResolvedValue({ id: 'app-2' });

    expect(await isUsernameAvailable('reserved')).toBe(false);
    expect(applicationFindFirst).toHaveBeenCalledWith({
      where: {
        proposedUsername: 'reserved',
        status: { in: ['PENDING', 'APPROVED'] },
        signupTokenUsed: false,
      },
    });
  });

  it('is available when neither a Curator nor a live application holds it', async () => {
    curatorFindUnique.mockResolvedValue(null);
    applicationFindFirst.mockResolvedValue(null);

    expect(await isUsernameAvailable('free')).toBe(true);
  });

  it('excludes the given application id from the reservation check, so re-entering your own proposed username at signup is allowed', async () => {
    curatorFindUnique.mockResolvedValue(null);
    applicationFindFirst.mockResolvedValue(null);

    expect(await isUsernameAvailable('mine', 'app-1')).toBe(true);
    expect(applicationFindFirst).toHaveBeenCalledWith({
      where: {
        proposedUsername: 'mine',
        status: { in: ['PENDING', 'APPROVED'] },
        signupTokenUsed: false,
        id: { not: 'app-1' },
      },
    });
  });
});
