import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey && process.env.NODE_ENV === 'production') {
  throw new Error('STRIPE_SECRET_KEY is not set.');
}

// Separate charges & transfers model (spec section 4): PaymentIntents are created on the
// platform account with no `transfer_data`/`on_behalf_of`; payouts to curators are issued
// later as standalone Transfer objects once the dispute window closes clean. This is what
// lets a single artist checkout hold funds per-curator and resolve each independently.
export const stripe = new Stripe(secretKey ?? 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
});

/** Creates (or reuses) a lightweight guest Customer so we can save one card and confirm
 *  several manual-capture PaymentIntents against it — one per curator hold in the campaign. */
export async function createGuestCustomer(email: string, name?: string) {
  return stripe.customers.create({ email, name });
}

/** Curator onboarding: Stripe-hosted Express account creation + onboarding link. */
export async function createExpressAccount(email: string) {
  return stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: false },
    },
  });
}

export async function createAccountOnboardingLink(accountId: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${base}/curator/dashboard/onboarding?refresh=1`,
    return_url: `${base}/curator/dashboard/onboarding?complete=1`,
  });
}

/** One manual-capture PaymentIntent per curator hold — this is the "separate hold per curator,
 *  shown as a line-item breakdown" from spec section 3. */
export async function createHoldPaymentIntent(params: {
  amountCents: number;
  customerId: string;
  paymentMethodId: string;
  holdId: string;
  campaignId: string;
}) {
  return stripe.paymentIntents.create({
    amount: params.amountCents,
    currency: 'usd',
    customer: params.customerId,
    payment_method: params.paymentMethodId,
    capture_method: 'manual',
    confirm: true,
    off_session: true,
    metadata: { holdId: params.holdId, campaignId: params.campaignId },
  });
}

export async function capturePaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.capture(paymentIntentId);
}

export async function cancelPaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.cancel(paymentIntentId);
}

/** Full refund on an already-captured PaymentIntent — used for post-deadline misses and
 *  dispute resolutions in the artist's favor, where the hold was captured before things went wrong. */
export async function refundPaymentIntent(paymentIntentId: string) {
  return stripe.refunds.create({ payment_intent: paymentIntentId });
}

/** Pays a curator out for a single resolved hold — the platform's 20% fee simply isn't transferred. */
export async function transferToCurator(params: {
  amountCents: number;
  destinationAccountId: string;
  holdId: string;
}) {
  return stripe.transfers.create({
    amount: params.amountCents,
    currency: 'usd',
    destination: params.destinationAccountId,
    metadata: { holdId: params.holdId },
  });
}
