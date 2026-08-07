'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GENRES, type GatedPlatform } from '@/lib/constants';

// Shown next to a verified-but-not-yet-listed gated platform on the curator dashboard —
// platform is fixed (already proven via OAuth), so this only asks for genre and price.
export function GatedListingForm({ platform }: { platform: GatedPlatform }) {
  const router = useRouter();
  const [genre, setGenre] = useState('POP');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/curator/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, genre, priceCents: Math.round(Number(price) * 100) }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <div className="w-40">
        <Select aria-label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
          {GENRES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-28">
        <Input
          type="number"
          min={5}
          step="0.01"
          placeholder="Price (USD)"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Adding…' : 'List it'}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
