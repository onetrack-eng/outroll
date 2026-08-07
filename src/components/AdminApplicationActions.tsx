'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function AdminApplicationActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'decline' | null>(null);

  async function act(action: 'approve' | 'decline') {
    setLoading(action);
    await fetch(`/api/admin/applications/${applicationId}/${action}`, { method: 'POST' });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex gap-3">
      <Button onClick={() => act('approve')} disabled={loading !== null}>
        {loading === 'approve' ? 'Approving…' : 'Approve'}
      </Button>
      <Button variant="danger" onClick={() => act('decline')} disabled={loading !== null}>
        {loading === 'decline' ? 'Declining…' : 'Decline'}
      </Button>
    </div>
  );
}
