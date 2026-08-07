'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';

export function AcceptDeclineActions({ holdId }: { holdId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: 'accept' | 'decline') {
    if (action === 'decline' && !confirm('Decline this submission? The artist will be refunded immediately.')) {
      return;
    }
    setLoading(action);
    setError(null);
    const res = await fetch(`/api/curator/submissions/${holdId}/${action}`, { method: 'POST' });
    setLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex gap-3">
        <Button onClick={() => act('accept')} disabled={loading !== null}>
          {loading === 'accept' ? 'Accepting…' : 'Accept'}
        </Button>
        <Button variant="danger" onClick={() => act('decline')} disabled={loading !== null}>
          {loading === 'decline' ? 'Declining…' : 'Decline'}
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function PostLinkForm({ holdId }: { holdId: string }) {
  const router = useRouter();
  const [postUrl, setPostUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/curator/submissions/${holdId}/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postUrl }),
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
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="postUrl">Live post link</Label>
        <Input
          id="postUrl"
          type="url"
          required
          placeholder="https://"
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Submitting…' : 'Submit post link'}
      </Button>
    </form>
  );
}
