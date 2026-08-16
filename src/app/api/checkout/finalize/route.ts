import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { magicLinkUrl } from '@/lib/magicLink';
import { sendMagicLinkEmail, sendCuratorNewSubmissionEmail } from '@/lib/resend';
import { RATE_LIMITS } from '@/lib/constants';
import { checkRateLimit, clientIp } from '@/lib/rateLimit';

// Step 3 of checkout: called once the client has sequentially confirmed every curator's
// PaymentIntent (including any 3D Secure challenge along the way — see
// CheckoutPaymentStep.tsx). We don't just trust the client's claim of success: each
// PaymentIntent is re-checked directly against Stripe before anything is sent, so a campaign
// whose payment isn't actually fully authorized can never trigger a "campaign submitted" email.
export async function POST(req: NextRequest) {
  const allowed = await checkRateLimit(`checkout:${clientIp(req)}`, RATE_LIMITS.CHECKOUT.limit, RATE_LIMITS.CHECKOUT.windowMs);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests from this connection. Please try again later.' }, { status: 429 });
  }

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

  // Marked before attempting email delivery (which is already best-effort below) so a
  // successfully-confirmed campaign is never swept up as "stuck" by sweepStuckCampaigns just
  // because Resend had a bad moment — see Campaign.finalizedAt in schema.prisma.
  await prisma.campaign.update({ where: { id: campaignId }, data: { finalizedAt: new Date() } });

  const dashboardUrl = magicLinkUrl(campaign.magicLinkToken);
  // Payment is already fully authorized at this point — an email provider hiccup (unverified
  // domain, rate limit, etc.) must not turn into a 500 for a customer who was just charged.
  // The success response still carries the magic link either way (see CheckoutPaymentStep.tsx).
  await sendMagicLinkEmail(campaign.artistEmail, dashboardUrl, holds.length).catch((err) =>
    console.error('Failed to send artist magic link email', err)
  );

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
