import { prisma } from '@/lib/db';

// A username is unavailable if either a real Curator already has it, or another applicant is
// still "holding" it via their own proposedUsername — PENDING or APPROVED-but-not-yet-signed-up
// applications reserve their desired username for the same reason a real Curator's does, so a
// second applicant can't take it out from under the first one while admin review is pending.
// DECLINED applications and ones that already completed signup (signupTokenUsed) don't hold a
// reservation — the username is either released (declined) or already governed by the real
// Curator row (signed up) at that point.
//
// excludeApplicationId lets a call site check "is this username available to *this*
// application" without the application's own reservation counting against itself — used by
// signup, where the applicant re-enters (and may keep) their own proposedUsername.
export async function isUsernameAvailable(username: string, excludeApplicationId?: string): Promise<boolean> {
  const existingCurator = await prisma.curator.findUnique({ where: { username } });
  if (existingCurator) return false;

  const reservedByAnotherApplication = await prisma.curatorApplication.findFirst({
    where: {
      proposedUsername: username,
      status: { in: ['PENDING', 'APPROVED'] },
      signupTokenUsed: false,
      ...(excludeApplicationId ? { id: { not: excludeApplicationId } } : {}),
    },
  });
  return !reservedByAnotherApplication;
}
