import { prisma } from '@/lib/db';
import { cancelPaymentIntent, refundPaymentIntent, transferToCurator } from '@/lib/stripe';
import { isPast } from '@/lib/businessDays';
import { magicLinkUrl } from '@/lib/magicLink';
import { sendArtistHoldStatusEmail, sendCuratorPayoutEmail } from '@/lib/resend';
import { formatCents } from '@/lib/constants';

// The three time-based state transitions in spec section 3, none of which depend on either
// party taking action:
//   1. Curator doesn't respond within 7 business days -> auto-decline, instant refund.
//   2. Curator accepts but doesn't post within a fresh 7 business days -> auto-refund.
//   3. Post goes undisputed for one calendar week -> auto-payout to curator.
// Meant to be invoked on a schedule (see /api/cron/deadlines and scripts/run-deadline-sweep.ts).
export async function runDeadlineSweep() {
  const now = new Date();
  let acceptTimeouts = 0;
  let postTimeouts = 0;
  let payoutsReleased = 0;
  const errors: string[] = [];

  // 1. Accept-window timeouts.
  const overdueForAccept = await prisma.hold.findMany({
    where: { status: 'PENDING', acceptDeadline: { lt: now } },
    include: { campaign: true, curator: true },
  });
  for (const hold of overdueForAccept) {
    try {
      if (hold.stripePaymentIntentId) {
        await cancelPaymentIntent(hold.stripePaymentIntentId);
      }
      await prisma.hold.update({
        where: { id: hold.id },
        data: { status: 'REFUNDED', refundedAt: now },
      });
      await sendArtistHoldStatusEmail(
        hold.campaign.artistEmail,
        magicLinkUrl(hold.campaign.magicLinkToken),
        hold.curator.displayName,
        'refunded'
      );
      acceptTimeouts += 1;
    } catch (err) {
      errors.push(`accept-timeout hold ${hold.id}: ${(err as Error).message}`);
    }
  }

  // 2. Post-window timeouts (funds were already captured on accept, so this is a real refund).
  const overdueForPost = await prisma.hold.findMany({
    where: { status: 'ACCEPTED', postDeadline: { lt: now } },
    include: { campaign: true, curator: true },
  });
  for (const hold of overdueForPost) {
    try {
      if (hold.stripePaymentIntentId) {
        await refundPaymentIntent(hold.stripePaymentIntentId);
      }
      await prisma.hold.update({
        where: { id: hold.id },
        data: { status: 'REFUNDED', refundedAt: now },
      });
      await sendArtistHoldStatusEmail(
        hold.campaign.artistEmail,
        magicLinkUrl(hold.campaign.magicLinkToken),
        hold.curator.displayName,
        'refunded'
      );
      postTimeouts += 1;
    } catch (err) {
      errors.push(`post-timeout hold ${hold.id}: ${(err as Error).message}`);
    }
  }

  // 3. Clean payout releases (posted, undisputed, one week elapsed).
  const readyForPayout = await prisma.hold.findMany({
    where: { status: 'POSTED', payoutReleaseAt: { lt: now } },
    include: { curator: true },
  });
  for (const hold of readyForPayout) {
    try {
      if (!hold.curator.stripeAccountId) {
        errors.push(`payout hold ${hold.id}: curator has no connected Stripe account yet`);
        continue;
      }
      if (!isPast(hold.payoutReleaseAt!)) continue; // safety re-check
      const transfer = await transferToCurator({
        amountCents: hold.priceCents,
        destinationAccountId: hold.curator.stripeAccountId,
        holdId: hold.id,
      });
      await prisma.hold.update({
        where: { id: hold.id },
        data: { status: 'PAID', paidAt: now, stripeTransferId: transfer.id },
      });
      await sendCuratorPayoutEmail(hold.curator.email, formatCents(hold.priceCents));
      payoutsReleased += 1;
    } catch (err) {
      errors.push(`payout hold ${hold.id}: ${(err as Error).message}`);
    }
  }

  return { acceptTimeouts, postTimeouts, payoutsReleased, errors };
}
