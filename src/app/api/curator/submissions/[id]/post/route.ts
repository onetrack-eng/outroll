import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCuratorSession } from '@/lib/auth';
import { postLinkSchema } from '@/lib/validations';
import { addCalendarDays, isPast } from '@/lib/businessDays';
import { PAYOUT_HOLD_WINDOW_DAYS } from '@/lib/constants';
import { magicLinkUrl } from '@/lib/magicLink';
import { sendArtistHoldStatusEmail } from '@/lib/resend';

// Curator submits the live post link. No verification is performed unless a dispute is filed
// (spec section 3) — we just start the one-week payout hold.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCuratorSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = postLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid link' }, { status: 400 });
  }

  const hold = await prisma.hold.findUnique({
    where: { id },
    include: { campaign: true, curator: true },
  });
  if (!hold || hold.curatorId !== session.sub) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }
  if (hold.status !== 'ACCEPTED') {
    return NextResponse.json({ error: 'This submission is not awaiting a post link.' }, { status: 409 });
  }
  if (hold.postDeadline && isPast(hold.postDeadline)) {
    return NextResponse.json(
      { error: 'The post window has passed; this will be auto-refunded shortly.' },
      { status: 409 }
    );
  }

  const now = new Date();
  const updated = await prisma.hold.update({
    where: { id: hold.id },
    data: {
      status: 'POSTED',
      postUrl: parsed.data.postUrl,
      postedAt: now,
      payoutReleaseAt: addCalendarDays(now, PAYOUT_HOLD_WINDOW_DAYS),
    },
  });

  await sendArtistHoldStatusEmail(
    hold.campaign.artistEmail,
    magicLinkUrl(hold.campaign.magicLinkToken),
    hold.curator.displayName,
    'posted'
  ).catch((err) => console.error('Failed to send posted email', err));

  return NextResponse.json({ hold: updated });
}
