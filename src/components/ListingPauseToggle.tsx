'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function ListingPauseToggle({ listingId, isPaused }: { listingId: string; isPaused: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/curator/listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPaused: !isPaused }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={toggle} disabled={loading}>
      {isPaused ? 'Resume listing' : 'Pause listing'}
    </Button>
  );
}
