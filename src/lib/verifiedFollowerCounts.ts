import { prisma } from '@/lib/db';
import { isGatedPlatform, PROFILE_URL_BASE } from '@/lib/constants';

export interface VerifiedConnection {
  followerCount: number | null;
  // Only set when the provider returned a handle and the count is null — lets the UI link
  // straight to the real profile instead of showing a number it doesn't have (Snapchat today;
  // see PROFILE_URL_BASE). Omitted whenever a real followerCount is available, since the number
  // itself is already the useful signal there.
  profileUrl?: string;
}

// Looks up verified OAuth connections for a batch of listings, keyed by `${curatorId}:${platform}`
// — a listing only has an entry here if that curator has connected that specific platform (see
// src/lib/socialAuth/). Used to prefer the live, verified data over the curator's single
// self-reported followerCount wherever listings are displayed.
export async function verifiedFollowerCountsFor(
  listings: { curatorId: string; platform: string }[]
): Promise<Map<string, VerifiedConnection>> {
  const curatorIds = [...new Set(listings.map((l) => l.curatorId))];
  if (curatorIds.length === 0) return new Map();

  const connections = await prisma.socialConnection.findMany({
    where: { curatorId: { in: curatorIds } },
  });

  return new Map(
    connections.map((c) => [
      `${c.curatorId}:${c.platform}`,
      {
        followerCount: c.followerCount,
        profileUrl:
          c.followerCount === null && c.externalHandle && isGatedPlatform(c.platform)
            ? `${PROFILE_URL_BASE[c.platform]}${c.externalHandle}`
            : undefined,
      },
    ])
  );
}
