import { prisma } from '@/lib/db';

// Looks up verified OAuth follower counts for a batch of listings, keyed by
// `${curatorId}:${platform}` — a listing only has an entry here if that curator has connected
// that specific platform (see src/lib/socialAuth/). Used to prefer the live, verified count
// over the curator's single self-reported followerCount wherever listings are displayed.
export async function verifiedFollowerCountsFor(
  listings: { curatorId: string; platform: string }[]
): Promise<Map<string, number>> {
  const curatorIds = [...new Set(listings.map((l) => l.curatorId))];
  if (curatorIds.length === 0) return new Map();

  const connections = await prisma.socialConnection.findMany({
    where: { curatorId: { in: curatorIds } },
  });

  return new Map(connections.map((c) => [`${c.curatorId}:${c.platform}`, c.followerCount]));
}
