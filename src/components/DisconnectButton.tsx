'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function DisconnectButton({ routeSegment, hasListing }: { routeSegment: string; hasListing: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function disconnect() {
    const message = hasListing
      ? 'Disconnect this account? Your listing on this platform will be paused until you reconnect and resume it.'
      : 'Disconnect this account?';
    if (!confirm(message)) return;
    setLoading(true);
    await fetch(`/api/curator/connections/${routeSegment}`, { method: 'DELETE' });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={disconnect} disabled={loading} className="!px-2 !py-1 text-xs text-muted">
      Disconnect
    </Button>
  );
}
