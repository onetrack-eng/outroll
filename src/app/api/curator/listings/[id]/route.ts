import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCuratorSession } from '@/lib/auth';
import { listingUpdateSchema } from '@/lib/validations';

// Pause/unpause a listing (spec section 2: "Can pause their listing temporarily without
// deleting it") and/or change its price. Curators may keep accepting on an active listing
// regardless of unresolved disputes elsewhere in their queue — dispute freezes are scoped to a
// single Hold, never a whole listing (spec section 2 & 3), so no dispute check happens here.
// Platform and genre aren't editable here — platform is tied to the verified SocialConnection
// (see GATED_PLATFORMS), and genre isn't something curators have asked to change per listing.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCuratorSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = listingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.curatorId !== session.sub) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const updated = await prisma.listing.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ listing: updated });
}

// Deleting is only safe for a listing that's never had a Hold created against it — Hold.listingId
// has no cascade (deliberately, so campaign history always resolves to a real listing), so the DB
// would reject the delete anyway once a Hold exists. Curators with campaign history should pause
// instead (spec section 2), which is why this returns a clear message rather than a raw FK error.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCuratorSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.curatorId !== session.sub) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const holdCount = await prisma.hold.count({ where: { listingId: id } });
  if (holdCount > 0) {
    return NextResponse.json(
      { error: "This listing has campaign history and can't be deleted — pause it instead." },
      { status: 409 }
    );
  }

  await prisma.listing.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
