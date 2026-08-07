import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';

// Stripe webhook — currently only cares about Connect account status. PaymentIntent
// capture/cancel and payout Transfers are all triggered synchronously from our own API
// routes (accept/decline/post/dispute-resolve), so we don't depend on webhook delivery for
// core state transitions. This still matters for onboarding, which finishes on Stripe's
// hosted UI outside our control.
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature/secret' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    const onboardingComplete = Boolean(account.details_submitted && account.capabilities?.transfers === 'active');
    await prisma.curator
      .updateMany({
        where: { stripeAccountId: account.id },
        data: { stripeOnboardingComplete: onboardingComplete },
      })
      .catch((err) => console.error('Failed to update curator onboarding status', err));
  }

  return NextResponse.json({ received: true });
}
