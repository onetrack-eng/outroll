'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Label, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PLATFORMS, GENRES, isGatedPlatform } from '@/lib/constants';

// Gated platforms (Instagram, Facebook Reels, TikTok, YouTube Shorts) are listed via
// GatedListingForm once verified — see the "Verified accounts" section above this form.
const MANUAL_PLATFORMS = PLATFORMS.filter((p) => !isGatedPlatform(p.value));

export function ListingCreateForm() {
  const router = useRouter();
  const [platform, setPlatform] = useState<string>(MANUAL_PLATFORMS[0].value);
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
    setPrice('');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
      <div>
        <Label htmlFor="platform">Platform</Label>
        <Select id="platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {MANUAL_PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="genre">Genre</Label>
        <Select id="genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
          {GENRES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="price">Price (USD)</Label>
        <Input
          id="price"
          type="number"
          min={5}
          step="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Adding…' : 'Add listing'}
      </Button>
      {error && <p className="col-span-full text-sm text-danger">{error}</p>}
    </form>
  );
}
