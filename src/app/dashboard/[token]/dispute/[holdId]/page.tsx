'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Textarea, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function FileDisputePage({
  params,
}: {
  params: Promise<{ token: string; holdId: string }>;
}) {
  const { token, holdId } = use(params);
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/artist/dispute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, holdId, reason }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Dispute filed</h1>
        <p className="mb-8 text-muted">
          We&rsquo;ll review and issue a binary resolution — full payout to the curator or a full
          refund to you.
        </p>
        <Button onClick={() => router.push(`/dashboard/${token}`)}>Back to dashboard</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">File a dispute</h1>
      <p className="mb-8 text-muted">
        Tell us what went wrong. Resolution is binary — full payout to the curator, or a full
        refund to you.
      </p>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="reason">What happened?</Label>
            <Textarea
              id="reason"
              rows={6}
              required
              minLength={20}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Submitting…' : 'Submit dispute'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
