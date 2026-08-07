'use client';

import { useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripeClient';
import { Button } from '@/components/ui/Button';

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

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
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? 'Payment failed. Please try again.');
      return;
    }

    onSuccess(data.magicLinkUrl);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PaymentElement />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={!stripe || submitting} className="w-full">
        {submitting ? 'Processing…' : 'Pay & submit campaign'}
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
