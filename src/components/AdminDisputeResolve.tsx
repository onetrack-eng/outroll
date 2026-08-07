'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Textarea, Label } from '@/components/ui/Input';

export function AdminDisputeResolve({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState<'CURATOR_PAID' | 'ARTIST_REFUNDED' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(resolution: 'CURATOR_PAID' | 'ARTIST_REFUNDED') {
    const label = resolution === 'CURATOR_PAID' ? 'pay the curator in full' : 'refund the artist in full';
    if (!confirm(`This will ${label}. This cannot be undone. Continue?`)) return;

    setLoading(resolution);
    setError(null);
    const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, adminNote: adminNote || undefined }),
    });
    setLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="adminNote">Internal note (optional)</Label>
        <Textarea id="adminNote" rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-3">
        <Button onClick={() => resolve('CURATOR_PAID')} disabled={loading !== null}>
          {loading === 'CURATOR_PAID' ? 'Processing…' : 'Pay curator in full'}
        </Button>
        <Button variant="danger" onClick={() => resolve('ARTIST_REFUNDED')} disabled={loading !== null}>
          {loading === 'ARTIST_REFUNDED' ? 'Processing…' : 'Refund artist in full'}
        </Button>
      </div>
    </div>
  );
}
