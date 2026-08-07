import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCuratorSession } from '@/lib/auth';
import { listingCreateSchema } from '@/lib/validations';
import { isGatedPlatform, platformLabel } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const session = await getCuratorSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = listingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid listing' }, { status: 400 });
  }

  if (isGatedPlatform(parsed.data.platform)) {
    const connection = await prisma.socialConnection.findUnique({
      where: { curatorId_platform: { curatorId: session.sub, platform: parsed.data.platform } },
    });
    if (!connection) {
      return NextResponse.json(
        { error: `Connect your ${platformLabel(parsed.data.platform)} account before listing on it.` },
        { status: 403 }
      );
    }
  }

  const listing = await prisma.listing.create({
    data: { ...parsed.data, curatorId: session.sub },
  });

  return NextResponse.json({ listing });
}
