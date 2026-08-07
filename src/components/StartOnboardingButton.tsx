'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function StartOnboardingButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const res = await fetch('/api/curator/onboarding', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
      alert(data.error ?? 'Could not start onboarding.');
    }
  }

  return (
    <Button onClick={onClick} disabled={loading}>
      {loading ? 'Redirecting…' : label}
    </Button>
  );
}
