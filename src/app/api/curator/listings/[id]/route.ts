import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCuratorSession } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({ isPaused: z.boolean() });

// Pause/unpause a listing (spec section 2: "Can pause their listing temporarily without
// deleting it"). Curators may keep accepting on an active listing regardless of unresolved
// disputes elsewhere in their queue — dispute freezes are scoped to a single Hold, never a
// whole listing (spec section 2 & 3), so no dispute check happens here.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCuratorSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing || listing.curatorId !== session.sub) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const updated = await prisma.listing.update({
    where: { id: params.id },
    data: { isPaused: parsed.data.isPaused },
  });

  return NextResponse.json({ listing: updated });
}
