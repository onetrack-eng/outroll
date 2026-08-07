'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PLATFORMS, GENRES } from '@/lib/constants';

export default function ApplyPage() {
  const [form, setForm] = useState({
    email: '',
    proposedUsername: '',
    platform: 'INSTAGRAM',
    genre: 'POP',
    followerCount: '',
    profileUrl: '',
    message: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/curator/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Application received</h1>
        <p className="text-muted">
          We review every application by hand. If approved, we&rsquo;ll email you a signup link.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Apply to curate</h1>
      <p className="mb-10 text-muted">Tell us about your page. Approval is manual — no bots, no auto-criteria.</p>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platform">Platform</Label>
              <Select id="platform" value={form.platform} onChange={(e) => update('platform', e.target.value)}>
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
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
          </div>
          <div>
            <Label htmlFor="followerCount">Follower count</Label>
            <Input
              id="followerCount"
              type="number"
              min={0}
              required
              value={form.followerCount}
              onChange={(e) => update('followerCount', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="profileUrl">Link to your page</Label>
            <Input
              id="profileUrl"
              type="url"
              required
              placeholder="https://"
              value={form.profileUrl}
              onChange={(e) => update('profileUrl', e.target.value)}
            />
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
            {loading ? 'Submitting…' : 'Submit application'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
