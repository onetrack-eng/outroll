import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyCheckoutDraft } from '@/lib/checkoutToken';
import { createHoldPaymentIntent, cancelPaymentIntent } from '@/lib/stripe';
import { generateMagicLinkToken, magicLinkUrl } from '@/lib/magicLink';
import { addBusinessDays } from '@/lib/businessDays';
import { CURATOR_ACCEPT_WINDOW_BUSINESS_DAYS } from '@/lib/constants';
import { sendMagicLinkEmail, sendCuratorNewSubmissionEmail } from '@/lib/resend';

// Step 2 of checkout: card is saved (client already confirmed the SetupIntent), so now we
// create the real Campaign + one Hold per curator, and one manual-capture PaymentIntent per
// Hold (spec section 3: "a separate hold is placed per curator"). If any PaymentIntent fails,
// we unwind everything already created rather than leave a half-charged campaign behind.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const checkoutToken = body?.checkoutToken as string | undefined;
  const paymentMethodId = body?.paymentMethodId as string | undefined;

  if (!checkoutToken || !paymentMethodId) {
    return NextResponse.json({ error: 'Missing checkout session' }, { status: 400 });
  }

  const draft = await verifyCheckoutDraft(checkoutToken);
  if (!draft) {
    return NextResponse.json(
      { error: 'Your checkout session expired. Please rebuild your campaign and try again.' },
      { status: 400 }
    );
  }

  const rawToken = generateMagicLinkToken();

  const campaign = await prisma.campaign.create({
    data: {
      artistEmail: draft.artistEmail,
      artistName: draft.artistName,
      magicLinkToken: rawToken,
      stripeCustomerId: draft.customerId,
    },
  });

  const createdHolds: { id: string; paymentIntentId: string; curatorId: string; listingId: string }[] = [];

  try {
    for (const pitch of draft.pitches) {
      const hold = await prisma.hold.create({
        data: {
          campaignId: campaign.id,
          listingId: pitch.listingId,
          curatorId: pitch.curatorId,
          assetLink: pitch.assetLink,
          narrative: pitch.narrative,
          context: pitch.context,
          priceCents: pitch.priceCents,
          platformFeeCents: pitch.platformFeeCents,
          totalChargeCents: pitch.totalChargeCents,
          acceptDeadline: addBusinessDays(new Date(), CURATOR_ACCEPT_WINDOW_BUSINESS_DAYS),
        },
      });

      const paymentIntent = await createHoldPaymentIntent({
        amountCents: pitch.totalChargeCents,
        customerId: draft.customerId,
        paymentMethodId,
        holdId: hold.id,
        campaignId: campaign.id,
      });

      await prisma.hold.update({
        where: { id: hold.id },
        data: { stripePaymentIntentId: paymentIntent.id },
      });

      createdHolds.push({
        id: hold.id,
        paymentIntentId: paymentIntent.id,
        curatorId: pitch.curatorId,
        listingId: pitch.listingId,
      });
    }
  } catch (err) {
    // Unwind: cancel any PaymentIntents already authorized, then delete the Campaign
    // (Holds cascade via the failed loop iteration never having written a PI, but we still
    // need to clean up rows created before the failure).
    for (const h of createdHolds) {
      await cancelPaymentIntent(h.paymentIntentId).catch(() => {});
    }
    await prisma.hold.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.campaign.delete({ where: { id: campaign.id } });

    console.error('Checkout confirm failed', err);
    return NextResponse.json(
      { error: 'Your card could not be charged. Please check your details and try again.' },
      { status: 402 }
    );
  }

  const dashboardUrl = magicLinkUrl(rawToken);

  await sendMagicLinkEmail(draft.artistEmail, dashboardUrl, createdHolds.length);

  const curators = await prisma.curator.findMany({
    where: { id: { in: createdHolds.map((h) => h.curatorId) } },
  });
  const curatorById = new Map(curators.map((c) => [c.id, c]));
  const artistLabel = draft.artistName ?? draft.artistEmail;

  for (const h of createdHolds) {
    const curator = curatorById.get(h.curatorId);
    if (curator) {
      await sendCuratorNewSubmissionEmail(
        curator.email,
        artistLabel,
        `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/curator/dashboard/submissions/${h.id}`
      ).catch((err) => console.error('Failed to send curator notification', err));
    }
  }

  return NextResponse.json({ magicLinkUrl: dashboardUrl });
}
