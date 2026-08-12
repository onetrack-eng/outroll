import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCuratorSession } from '@/lib/auth';
import { platformForStartRoute } from '@/lib/socialAuth';

// Disconnects a verified social account (e.g. the underlying profile got banned/lost). Any
// listing on that platform is paused, not deleted, since it's no longer backed by a verified
// connection -- reconnecting doesn't auto-resume it, so the curator can review price/details
// before going live again. `params.platform` is the same route-friendly segment used by
// /start (e.g. "youtube_shorts"), not the Prisma enum value directly.
export async function DELETE(_req: NextRequest, { params }: { params: { platform: string } }) {
  const session = await getCuratorSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const platform = platformForStartRoute(params.platform);
  if (!platform) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 404 });
  }

  const connection = await prisma.socialConnection.findUnique({
    where: { curatorId_platform: { curatorId: session.sub, platform } },
  });
  if (!connection) {
    return NextResponse.json({ error: 'Not connected' }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.socialConnection.delete({ where: { id: connection.id } }),
    prisma.listing.updateMany({
      where: { curatorId: session.sub, platform },
      data: { isPaused: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
