'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCents, platformLabel, genreLabel } from '@/lib/constants';

interface ListingRowProps {
  id: string;
  platform: string;
  genre: string;
  priceCents: number;
  isPaused: boolean;
}

// Owns all per-listing actions a curator can take: edit price, pause/resume, delete. Delete is
// only ever possible for a listing with no campaign history — the API enforces this and returns
// a clear error, which just gets surfaced here rather than pre-computed, since that check
// requires a Hold count the listings page doesn't otherwise need to fetch.
export function ListingRow({ id, platform, genre, priceCents, isPaused }: ListingRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState((priceCents / 100).toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/curator/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong.');
      return false;
    }
    return true;
  }

  async function savePrice() {
    const priceCentsValue = Math.round(Number(price) * 100);
    if (!priceCentsValue || priceCentsValue < 500) {
      setError('Minimum price is $5.00');
      return;
    }
    if (await patch({ priceCents: priceCentsValue })) {
      setEditing(false);
      router.refresh();
    }
  }

  async function togglePause() {
    if (await patch({ isPaused: !isPaused })) {
      router.refresh();
    }
  }

  async function remove() {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/curator/listings/${id}`, { method: 'DELETE' });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge>{platformLabel(platform)}</Badge>
          <Badge tone="neutral">{genreLabel(genre)}</Badge>
          {editing ? (
            <div className="flex items-center gap-2">
              <div className="w-24">
                <Input
                  type="number"
                  min={5}
                  step="0.01"
                  aria-label="Price (USD)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <Button onClick={savePrice} disabled={loading}>
                Save
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(false);
                  setPrice((priceCents / 100).toFixed(2));
                  setError(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-medium text-ink underline decoration-dotted underline-offset-4 hover:decoration-solid"
            >
              {formatCents(priceCents)}
            </button>
          )}
          {isPaused && <Badge tone="warning">Paused</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={togglePause} disabled={loading || editing}>
            {isPaused ? 'Resume listing' : 'Pause listing'}
          </Button>
          <Button variant="danger" onClick={remove} disabled={loading || editing}>
            Delete
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}
