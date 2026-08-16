import { NextRequest, NextResponse } from 'next/server';
import { abortCampaign } from '@/lib/checkoutCleanup';
import { RATE_LIMITS } from '@/lib/constants';
import { checkRateLimit, clientIp } from '@/lib/rateLimit';

// Client-side confirmation (see CheckoutPaymentStep.tsx) can fail partway through a
// multi-curator campaign — a declined card, an abandoned 3D Secure challenge, a curator's
// PaymentIntent failing after an earlier one already succeeded. This cancels every
// PaymentIntent already created for the campaign (uncofirmed or authorized, cancel works for
// both) and removes the draft Campaign/Holds, mirroring the unwind that used to live inside
// /api/checkout/confirm before confirmation moved client-side.
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

  await abortCampaign(campaignId);

  return NextResponse.json({ ok: true });
}
