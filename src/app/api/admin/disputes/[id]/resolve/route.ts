import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';
import { refundPaymentIntent, transferToCurator } from '@/lib/stripe';
import { magicLinkUrl } from '@/lib/magicLink';
import { sendDisputeOutcomeEmail, sendCuratorDisputeResolvedEmail } from '@/lib/resend';

const schema = z.object({
  resolution: z.enum(['CURATOR_PAID', 'ARTIST_REFUNDED']),
  adminNote: z.string().max(2000).optional(),
});

// Admin's binary dispute resolution (spec section 2: "full payout to curator or full refund
// to artist (no partial outcomes) — scoped to the single disputed hold"). Every other hold in
// the campaign, and every other hold this curator has in flight, is unaffected.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: { hold: { include: { curator: true, campaign: true } } },
  });
  if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
  if (dispute.status !== 'OPEN') {
    return NextResponse.json({ error: 'This dispute has already been resolved.' }, { status: 409 });
  }

  const { hold } = dispute;
  const now = new Date();

  if (parsed.data.resolution === 'CURATOR_PAID') {
    if (!hold.curator.stripeAccountId) {
      return NextResponse.json(
        { error: "This curator hasn't finished Stripe payout setup yet — cannot transfer funds." },
        { status: 409 }
      );
    }
    const transfer = await transferToCurator({
      amountCents: hold.priceCents,
      destinationAccountId: hold.curator.stripeAccountId,
      holdId: hold.id,
    });
    await prisma.hold.update({
      where: { id: hold.id },
      data: { status: 'PAID', paidAt: now, stripeTransferId: transfer.id },
    });
  } else {
    if (hold.stripePaymentIntentId) {
      await refundPaymentIntent(hold.stripePaymentIntentId);
    }
    await prisma.hold.update({ where: { id: hold.id }, data: { status: 'REFUNDED', refundedAt: now } });
  }

  await prisma.dispute.update({
    where: { id: dispute.id },
    data: {
      status: 'RESOLVED',
      resolution: parsed.data.resolution,
      adminNote: parsed.data.adminNote,
      resolvedAt: now,
    },
  });

  const outcome = parsed.data.resolution === 'CURATOR_PAID' ? 'curator_paid' : 'refunded';

  await sendDisputeOutcomeEmail(
    hold.campaign.artistEmail,
    magicLinkUrl(hold.campaign.magicLinkToken),
    hold.curator.displayName,
    outcome
  ).catch((err) => console.error('Failed to send dispute outcome email', err));

  await sendCuratorDisputeResolvedEmail(hold.curator.email, outcome).catch((err) =>
    console.error('Failed to send curator dispute-resolved email', err)
  );

  return NextResponse.json({ ok: true });
}
