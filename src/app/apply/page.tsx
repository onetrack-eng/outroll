'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GENRES } from '@/lib/constants';

export default function ApplyPage() {
  const [form, setForm] = useState({
    email: '',
    proposedUsername: '',
    genre: 'POP',
    message: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Applying always leaves this page mid-flow (full navigation to Instagram's OAuth dialog) and
  // lands back here after the provider redirects through our callback — see
  // completeConnection.ts, which resolves to either /apply?submitted=1 or
  // /apply?connection_error=... Read directly off the URL rather than useSearchParams() to
  // avoid the Suspense-boundary requirement for a one-time check on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('submitted')) {
      setSubmitted(true);
    } else if (params.get('connection_error')) {
      setError(params.get('connection_error'));
    }
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/curator/apply/start-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setLoading(false);
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    const data = await res.json();
    window.location.href = data.redirectUrl; // full navigation into Instagram's OAuth dialog
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Application received</h1>
        <p className="text-muted">
          We&rsquo;ll review every application by hand. If approved, we&rsquo;ll email you a signup link.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Apply to curate</h1>
      <p className="mb-10 text-muted">
        Tell us about your page, then connect your Instagram — we verify every applicant&rsquo;s
        real follower count directly, no self-reporting. Approval is manual — no bots, no
        auto-criteria.
      </p>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="proposedUsername">Desired username</Label>
            <Input
              id="proposedUsername"
              required
              value={form.proposedUsername}
              onChange={(e) => update('proposedUsername', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="genre">Primary genre</Label>
            <Select id="genre" value={form.genre} onChange={(e) => update('genre', e.target.value)}>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="message">Tell us about your audience</Label>
            <Textarea
              id="message"
              rows={5}
              required
              minLength={20}
              value={form.message}
              onChange={(e) => update('message', e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Redirecting…' : 'Connect Instagram & apply'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
