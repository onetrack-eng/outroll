'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { isSecureAssetLink } from '@/lib/constants';

export function AddToCampaignForm({
  listingId,
  curatorDisplayName,
  platformLabel,
  genre,
  priceCents,
}: {
  listingId: string;
  curatorDisplayName: string;
  platformLabel: string;
  genre: string;
  priceCents: number;
}) {
  const { addItem, items, hydrated } = useCart();
  const router = useRouter();
  const [assetLink, setAssetLink] = useState('');
  const [narrative, setNarrative] = useState('');
  const [context, setContext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const existingItem = items.find((i) => i.listingId === listingId);

  // Pre-fill from the cart if this pitch was already submitted — runs once, right when the
  // cart finishes loading from localStorage, so editing doesn't clobber the loaded values with
  // the initial empty state and doesn't keep re-running and stomping on later user edits.
  useEffect(() => {
    if (!hydrated) return;
    const existing = items.find((i) => i.listingId === listingId);
    if (existing) {
      setAssetLink(existing.assetLink);
      setNarrative(existing.narrative);
      setContext(existing.context);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSecureAssetLink(assetLink)) {
      setError('Must be a secure (https) link from Google Drive, Dropbox, OneDrive, Box, or iCloud.');
      return;
    }
    setError(null);
    addItem({
      listingId,
      curatorDisplayName,
      platformLabel,
      genre,
      priceCents,
      assetLink,
      narrative,
      context,
    });
    setAdded(true);
  }

  if (added) {
    return (
      <div className="rounded-xl border border-line bg-mist p-5 text-sm">
        <p className="mb-3 text-ink">{existingItem ? 'Pitch updated.' : 'Added to your campaign.'}</p>
        <Button variant="secondary" onClick={() => router.push('/checkout')}>
          Review campaign & pay
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {existingItem && (
        <p className="rounded-lg bg-mist px-3.5 py-2.5 text-xs text-muted">
          Already in your campaign — edit below and update to change it.
        </p>
      )}
      <div>
        <Label htmlFor="assetLink">Asset folder link</Label>
        <Input
          id="assetLink"
          type="url"
          placeholder="https://drive.google.com/... or Dropbox, OneDrive, Box, iCloud"
          value={assetLink}
          onChange={(e) => setAssetLink(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-muted">
          Visual assets only — photos and/or videos you&rsquo;d like included (cover photos,
          artist photos, anything for the curator to swipe through or use as slides). Any secure
          folder link works: Google Drive, Dropbox, OneDrive, Box, or iCloud.
        </p>
      </div>
      <div>
        <Label htmlFor="narrative">Narrative</Label>
        <Textarea
          id="narrative"
          rows={2}
          placeholder={'e.g. "[Artist name] gets noticed by Ariana Grande"'}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          minLength={10}
          maxLength={500}
          required
        />
        <p className="mt-1 text-xs text-muted">
          The one-line story you want this post built around.
        </p>
      </div>
      <div>
        <Label htmlFor="context">Further explanation (optional)</Label>
        <Textarea
          id="context"
          rows={4}
          placeholder={'e.g. "Ariana Grande found this artist while she was streaming..."'}
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted">
          Any extra detail the curator should know to bring the narrative to life.
        </p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full">
        {existingItem ? 'Update pitch' : 'Add to campaign'}
      </Button>
    </form>
  );
}
