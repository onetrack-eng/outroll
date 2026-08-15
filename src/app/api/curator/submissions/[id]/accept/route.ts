import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCuratorSession } from '@/lib/auth';
import { capturePaymentIntent } from '@/lib/stripe';
import { addBusinessDays, isPast } from '@/lib/businessDays';
import { CURATOR_POST_WINDOW_BUSINESS_DAYS } from '@/lib/constants';
import { magicLinkUrl } from '@/lib/magicLink';
import { sendArtistHoldStatusEmail } from '@/lib/resend';

// Curator accepts a submission: capture the held PaymentIntent immediately (spec section 3:
// "On accept, the hold is captured immediately") and open a fresh 7-business-day post window.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCuratorSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const hold = await prisma.hold.findUnique({
    where: { id },
    include: { campaign: true, curator: true },
  });
  if (!hold || hold.curatorId !== session.sub) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }
  if (hold.status !== 'PENDING') {
    return NextResponse.json({ error: 'This submission has already been actioned.' }, { status: 409 });
  }
  if (isPast(hold.acceptDeadline)) {
    return NextResponse.json(
      { error: 'The 7-business-day response window has passed; this will be auto-declined shortly.' },
      { status: 409 }
    );
  }
  if (!hold.stripePaymentIntentId) {
    return NextResponse.json({ error: 'No payment on file for this submission.' }, { status: 500 });
  }

  await capturePaymentIntent(hold.stripePaymentIntentId);

  const updated = await prisma.hold.update({
    where: { id: hold.id },
    data: {
      status: 'ACCEPTED',
      respondedAt: new Date(),
      postDeadline: addBusinessDays(new Date(), CURATOR_POST_WINDOW_BUSINESS_DAYS),
    },
  });

  await sendArtistHoldStatusEmail(
    hold.campaign.artistEmail,
    magicLinkUrl(hold.campaign.magicLinkToken),
    hold.curator.displayName,
    'accepted'
  ).catch((err) => console.error('Failed to send accept email', err));

  return NextResponse.json({ hold: updated });
}
