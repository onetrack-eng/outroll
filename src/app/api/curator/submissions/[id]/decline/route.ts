import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCuratorSession } from '@/lib/auth';
import { cancelPaymentIntent } from '@/lib/stripe';
import { isPast } from '@/lib/businessDays';
import { magicLinkUrl } from '@/lib/magicLink';
import { sendArtistHoldStatusEmail } from '@/lib/resend';

// Curator declines: cancel the authorized PaymentIntent, which releases the hold and refunds
// the artist instantly (spec section 3: "Declines and timeouts release the hold instantly").
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCuratorSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const hold = await prisma.hold.findUnique({
    where: { id: params.id },
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
      { error: 'The response window has passed; this will be auto-declined shortly.' },
      { status: 409 }
    );
  }
  if (hold.stripePaymentIntentId) {
    await cancelPaymentIntent(hold.stripePaymentIntentId);
  }

  const updated = await prisma.hold.update({
    where: { id: hold.id },
    data: { status: 'DECLINED', respondedAt: new Date() },
  });

  await sendArtistHoldStatusEmail(
    hold.campaign.artistEmail,
    magicLinkUrl(hold.campaign.magicLinkToken),
    hold.curator.displayName,
    'declined'
  ).catch((err) => console.error('Failed to send decline email', err));

  return NextResponse.json({ hold: updated });
}
