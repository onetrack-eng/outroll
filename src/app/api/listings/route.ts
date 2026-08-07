import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Read-only JSON listing feed — the marketing site queries Prisma directly server-side;
// this exists for programmatic/API access (e.g. a future mobile client).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform') ?? undefined;
  const genre = searchParams.get('genre') ?? undefined;
  const sort = searchParams.get('sort') === 'desc' ? 'desc' : 'asc';

  const listings = await prisma.listing.findMany({
    where: {
      isPaused: false,
      ...(platform ? { platform: platform as any } : {}),
      ...(genre ? { genre: genre as any } : {}),
    },
    include: { curator: { select: { id: true, displayName: true, followerCount: true } } },
    orderBy: { priceCents: sort },
  });

  return NextResponse.json({ listings });
}
