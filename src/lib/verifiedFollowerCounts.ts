import { prisma } from '@/lib/db';

// Looks up verified OAuth follower counts for a batch of listings, keyed by
// `${curatorId}:${platform}` — a listing only has an entry here if that curator has connected
// that specific platform (see src/lib/socialAuth/). Used to prefer the live, verified count
// over the curator's single self-reported followerCount wherever listings are displayed.
// Value is `null` for a real, ownership-verified connection that just has no follower-count API
// (Snapchat today) — distinct from "no entry at all", which means no connection exists.
export async function verifiedFollowerCountsFor(
  listings: { curatorId: string; platform: string }[]
): Promise<Map<string, number | null>> {
  const curatorIds = [...new Set(listings.map((l) => l.curatorId))];
  if (curatorIds.length === 0) return new Map();

  const connections = await prisma.socialConnection.findMany({
    where: { curatorId: { in: curatorIds } },
  });

  return new Map(connections.map((c) => [`${c.curatorId}:${c.platform}`, c.followerCount]));
}
