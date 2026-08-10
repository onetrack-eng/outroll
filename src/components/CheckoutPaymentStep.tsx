'use client';

import { useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripeClient';
import { Button } from '@/components/ui/Button';

interface HoldToConfirm {
  holdId: string;
  clientSecret: string;
}

async function abortCampaign(campaignId: string) {
  await fetch('/api/checkout/abort', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId }),
  }).catch(() => {});
}

function InnerForm({
  checkoutToken,
  onSuccess,
}: {
  checkoutToken: string;
  onSuccess: (magicLinkUrl: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    setProgress(null);

    const { error: elementsError } = await elements.submit();
    if (elementsError) {
      setError(elementsError.message ?? 'Please check your card details.');
      setSubmitting(false);
      return;
    }

    const { error: setupError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    });

    if (setupError || !setupIntent || typeof setupIntent.payment_method !== 'string') {
      setError(setupError?.message ?? 'Could not save your card. Please try again.');
      setSubmitting(false);
      return;
    }

    const res = await fetch('/api/checkout/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutToken, paymentMethodId: setupIntent.payment_method }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    const campaignId = data.campaignId as string;
    const holds = data.holds as HoldToConfirm[];

    // Each curator's charge is authorized one at a time, on this page, rather than off-session
    // on the server — that's what lets Stripe pop a 3D Secure challenge for any card that
    // needs one instead of the confirmation just failing outright.
    for (let i = 0; i < holds.length; i += 1) {
      setProgress({ current: i + 1, total: holds.length });

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(holds[i].clientSecret);

      if (confirmError || !paymentIntent || paymentIntent.status !== 'requires_capture') {
        setProgress(null);
        setSubmitting(false);
        setError(
          confirmError?.message ??
            'Your payment could not be confirmed for one of your curators. Nothing was charged.'
        );
        await abortCampaign(campaignId);
        return;
      }
    }

    const finalizeRes = await fetch('/api/checkout/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId }),
    });
    const finalizeData = await finalizeRes.json().catch(() => ({}));
    setProgress(null);
    setSubmitting(false);

    if (!finalizeRes.ok) {
      setError(
        finalizeData.error ??
          'Your payment succeeded but we could not finish submitting your campaign. Please contact support.'
      );
      return;
    }

    onSuccess(finalizeData.magicLinkUrl);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PaymentElement />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={!stripe || submitting} className="w-full">
        {progress
          ? `Confirming payment ${progress.current} of ${progress.total}…`
          : submitting
            ? 'Processing…'
            : 'Pay & submit campaign'}
      </Button>
    </form>
  );
}

export function CheckoutPaymentStep({
  clientSecret,
  checkoutToken,
  onSuccess,
}: {
  clientSecret: string;
  checkoutToken: string;
  onSuccess: (magicLinkUrl: string) => void;
}) {
  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#f2f4f4',
            colorBackground: '#141b1d',
            colorText: '#f2f4f4',
            colorDanger: '#ff6b6b',
          },
        },
      }}
    >
      <InnerForm checkoutToken={checkoutToken} onSuccess={onSuccess} />
    </Elements>
  );
}
