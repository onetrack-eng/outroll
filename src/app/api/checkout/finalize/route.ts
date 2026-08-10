import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { magicLinkUrl } from '@/lib/magicLink';
import { sendMagicLinkEmail, sendCuratorNewSubmissionEmail } from '@/lib/resend';

// Step 3 of checkout: called once the client has sequentially confirmed every curator's
// PaymentIntent (including any 3D Secure challenge along the way — see
// CheckoutPaymentStep.tsx). We don't just trust the client's claim of success: each
// PaymentIntent is re-checked directly against Stripe before anything is sent, so a campaign
// whose payment isn't actually fully authorized can never trigger a "campaign submitted" email.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const campaignId = body?.campaignId as string | undefined;
  if (!campaignId) {
    return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const holds = await prisma.hold.findMany({
    where: { campaignId },
    include: { curator: true },
  });

  for (const hold of holds) {
    if (!hold.stripePaymentIntentId) {
      return NextResponse.json({ error: 'Payment has not been confirmed for every curator yet.' }, { status: 409 });
    }
    const paymentIntent = await stripe.paymentIntents.retrieve(hold.stripePaymentIntentId);
    if (paymentIntent.status !== 'requires_capture') {
      return NextResponse.json({ error: 'Payment has not been confirmed for every curator yet.' }, { status: 409 });
    }
  }

  const dashboardUrl = magicLinkUrl(campaign.magicLinkToken);
  await sendMagicLinkEmail(campaign.artistEmail, dashboardUrl, holds.length);

  const artistLabel = campaign.artistName ?? campaign.artistEmail;
  for (const hold of holds) {
    await sendCuratorNewSubmissionEmail(
      hold.curator.email,
      artistLabel,
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/curator/dashboard/submissions/${hold.id}`
    ).catch((err) => console.error('Failed to send curator notification', err));
  }

  return NextResponse.json({ magicLinkUrl: dashboardUrl });
}
