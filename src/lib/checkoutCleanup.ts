import { prisma } from '@/lib/db';
import { cancelPaymentIntent } from '@/lib/stripe';

// Cancels every Hold's PaymentIntent (works whether it was ever confirmed — cancel releases an
// authorized-but-uncaptured PaymentIntent same as an unconfirmed one) and deletes the
// Campaign/Holds outright. Shared by /api/checkout/abort (client-triggered, e.g. a declined
// card or an abandoned 3D Secure challenge) and sweepStuckCampaigns in deadlineSweep.ts
// (time-triggered, for a campaign whose checkout flow never completed at all).
export async function abortCampaign(campaignId: string): Promise<void> {
  const holds = await prisma.hold.findMany({ where: { campaignId } });
  for (const hold of holds) {
    if (hold.stripePaymentIntentId) {
      await cancelPaymentIntent(hold.stripePaymentIntentId).catch(() => {});
    }
  }
  await prisma.hold.deleteMany({ where: { campaignId } });
  await prisma.campaign.deleteMany({ where: { id: campaignId } });
}
