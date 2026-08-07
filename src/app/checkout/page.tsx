'use client';

import { useState } from 'react';
import { useCart } from '@/components/CartProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { formatCents } from '@/lib/constants';
import { CheckoutPaymentStep } from '@/components/CheckoutPaymentStep';
import Link from 'next/link';

type Step = 'review' | 'payment' | 'success';

export default function CheckoutPage() {
  const { items, removeItem, clear } = useCart();
  const [step, setStep] = useState<Step>('review');
  const [artistEmail, setArtistEmail] = useState('');
  const [artistName, setArtistName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);
  const [totalChargeCents, setTotalChargeCents] = useState(0);
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null);

  const subtotal = items.reduce((sum, i) => sum + Math.round(i.priceCents * 1.2), 0);

  async function startPayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artistEmail,
        artistName: artistName || undefined,
        pitches: items.map((i) => ({
          listingId: i.listingId,
          assetLink: i.assetLink,
          narrative: i.narrative,
          context: i.context,
        })),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.');
      return;
    }

    setClientSecret(data.clientSecret);
    setCheckoutToken(data.checkoutToken);
    setTotalChargeCents(data.totalChargeCents);
    setStep('payment');
  }

  if (step === 'success' && magicLinkUrl) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="mb-4 text-3xl font-semibold tracking-tight">Campaign submitted</h1>
        <p className="mb-8 text-muted">
          We&rsquo;ve emailed your no-login dashboard link to {artistEmail}. You can also open it
          right now:
        </p>
        <Card>
          <a href={magicLinkUrl} className="break-all text-sm text-ink underline">
            {magicLinkUrl}
          </a>
        </Card>
      </div>
    );
  }

  if (items.length === 0 && step === 'review') {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Your campaign is empty</h1>
        <p className="mb-8 text-muted">Browse curators and add a pitch to get started.</p>
        <Link href="/browse">
          <Button>Browse curators</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-10 text-3xl font-semibold tracking-tight">Your campaign</h1>

      <div className="mb-10 space-y-4">
        {items.map((item) => (
          <Card key={item.listingId} className="flex items-start justify-between">
            <div>
              <div className="font-medium text-ink">{item.curatorDisplayName}</div>
              <div className="text-sm text-muted">
                {item.platformLabel} · {item.genre}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-ink">{formatCents(Math.round(item.priceCents * 1.2))}</div>
              {step === 'review' && (
                <div className="mt-1 flex justify-end gap-3">
                  <Link href={`/listings/${item.listingId}`} className="text-xs text-muted underline">
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeItem(item.listingId)}
                    className="text-xs text-muted underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}
        <div className="flex items-center justify-between border-t border-line pt-4 text-lg font-semibold">
          <span>Total</span>
          <span>{formatCents(step === 'payment' ? totalChargeCents : subtotal)}</span>
        </div>
      </div>

      {step === 'review' && (
        <form onSubmit={startPayment} className="space-y-4">
          <div>
            <Label htmlFor="artistEmail">Your email</Label>
            <Input
              id="artistEmail"
              type="email"
              required
              value={artistEmail}
              onChange={(e) => setArtistEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <p className="mt-1 text-xs text-muted">
              Your dashboard link and every status update goes here — no account needed.
            </p>
          </div>
          <div>
            <Label htmlFor="artistName">Name or artist handle (optional)</Label>
            <Input id="artistName" value={artistName} onChange={(e) => setArtistName(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Preparing checkout…' : 'Continue to payment'}
          </Button>
        </form>
      )}

      {step === 'payment' && clientSecret && checkoutToken && (
        <CheckoutPaymentStep
          clientSecret={clientSecret}
          checkoutToken={checkoutToken}
          onSuccess={(url) => {
            setMagicLinkUrl(url);
            clear();
            setStep('success');
          }}
        />
      )}
    </div>
  );
}
