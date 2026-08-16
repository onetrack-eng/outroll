import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkoutSchema } from '@/lib/validations';
import { computeCharge, RATE_LIMITS } from '@/lib/constants';
import { createGuestCustomer, stripe } from '@/lib/stripe';
import { signCheckoutDraft, DraftPitch } from '@/lib/checkoutToken';
import { checkRateLimit, clientIp } from '@/lib/rateLimit';

// Step 1 of checkout: validate the cart against live listing data (never trust client-side
// pricing), open a guest Stripe Customer, and issue a SetupIntent to collect the card.
// Nothing is written to Postgres yet — see lib/checkoutToken.ts for why.
export async function POST(req: NextRequest) {
  const allowed = await checkRateLimit(`checkout:${clientIp(req)}`, RATE_LIMITS.CHECKOUT.limit, RATE_LIMITS.CHECKOUT.windowMs);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests from this connection. Please try again later.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  const { artistEmail, artistName, pitches: inputPitches } = parsed.data;

  const listingIds = inputPitches.map((p) => p.listingId);
  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds }, isPaused: false },
  });

  if (listings.length !== listingIds.length) {
    return NextResponse.json(
      { error: 'One or more listings in your campaign are no longer available.' },
      { status: 409 }
    );
  }

  const listingById = new Map(listings.map((l) => [l.id, l]));
  const pitches: DraftPitch[] = inputPitches.map((p) => {
    const listing = listingById.get(p.listingId)!;
    const { priceCents, platformFeeCents, totalChargeCents } = computeCharge(listing.priceCents);
    return {
      listingId: listing.id,
      curatorId: listing.curatorId,
      assetLink: p.assetLink,
      narrative: p.narrative,
      context: p.context,
      priceCents,
      platformFeeCents,
      totalChargeCents,
    };
  });

  const customer = await createGuestCustomer(artistEmail, artistName);

  const setupIntent = await stripe.setupIntents.create({
    customer: customer.id,
    usage: 'off_session',
    payment_method_types: ['card'],
  });

  const checkoutToken = await signCheckoutDraft({
    artistEmail,
    artistName,
    customerId: customer.id,
    pitches,
  });

  return NextResponse.json({
    clientSecret: setupIntent.client_secret,
    checkoutToken,
    pitches,
    totalChargeCents: pitches.reduce((sum, p) => sum + p.totalChargeCents, 0),
  });
}
