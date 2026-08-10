import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyCheckoutDraft } from '@/lib/checkoutToken';
import { createHoldPaymentIntent, cancelPaymentIntent } from '@/lib/stripe';
import { generateMagicLinkToken, magicLinkUrl } from '@/lib/magicLink';
import { addBusinessDays } from '@/lib/businessDays';
import { CURATOR_ACCEPT_WINDOW_BUSINESS_DAYS } from '@/lib/constants';

// Step 2 of checkout: card is saved (client already confirmed the SetupIntent), so now we
// create the real Campaign + one Hold per curator, and one manual-capture PaymentIntent per
// Hold (spec section 3: "a separate hold is placed per curator") — created but *not confirmed*
// here. Confirmation happens client-side next, one hold at a time (see
// CheckoutPaymentStep.tsx and /api/checkout/finalize), so that a card requiring 3D Secure can
// actually challenge the customer instead of failing under off-session confirmation. If any
// PaymentIntent fails to even get created, we unwind everything already created rather than
// leave a half-built campaign behind; if creation succeeds but a later client-side confirmation
// fails, /api/checkout/abort does the equivalent unwind.
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

  const createdHolds: { id: string; paymentIntentId: string; clientSecret: string }[] = [];

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

      if (!paymentIntent.client_secret) {
        throw new Error(`PaymentIntent ${paymentIntent.id} was created without a client secret`);
      }

      await prisma.hold.update({
        where: { id: hold.id },
        data: { stripePaymentIntentId: paymentIntent.id },
      });

      createdHolds.push({
        id: hold.id,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      });
    }
  } catch (err) {
    // Unwind: cancel any PaymentIntents already created, then delete the Campaign/Holds
    // rather than leave a half-built campaign behind. Nothing has been charged at this point
    // (every PaymentIntent above was created unconfirmed), so this is just cleanup, not a
    // refund.
    for (const h of createdHolds) {
      await cancelPaymentIntent(h.paymentIntentId).catch(() => {});
    }
    await prisma.hold.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.campaign.delete({ where: { id: campaign.id } });

    console.error('Checkout confirm failed', err);
    return NextResponse.json(
      { error: 'Something went wrong setting up your campaign. Please try again.' },
      { status: 402 }
    );
  }

  return NextResponse.json({
    campaignId: campaign.id,
    magicLinkUrl: magicLinkUrl(rawToken),
    holds: createdHolds.map((h) => ({ holdId: h.id, clientSecret: h.clientSecret })),
  });
}
