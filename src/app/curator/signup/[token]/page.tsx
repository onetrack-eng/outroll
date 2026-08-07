'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input, Label, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PLATFORMS, isGatedPlatform, type PlatformValue } from '@/lib/constants';

// Instagram/Facebook Reels/TikTok/YouTube Shorts require OAuth verification, which needs an
// authenticated curator to exist first — so they're only offered after signup, from the
// dashboard's "Connect account" flow, not in this at-signup pricing list.
const MANUAL_PLATFORMS = PLATFORMS.filter((p) => !isGatedPlatform(p.value));

interface PricingRow {
  platform: PlatformValue | '';
  price: string;
}

export default function CuratorSignupPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [rows, setRows] = useState<PricingRow[]>([{ platform: '', price: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function platformOptionsFor(rowIndex: number) {
    const chosenElsewhere = new Set(
      rows.filter((_, i) => i !== rowIndex).map((r) => r.platform).filter(Boolean)
    );
    return MANUAL_PLATFORMS.filter((p) => !chosenElsewhere.has(p.value));
  }

  function setRowPlatform(index: number, platform: PlatformValue | '') {
    setRows((prev) => {
      const next = prev.map((row, i) => (i === index ? { ...row, platform } : row));
      const canAddMore = next.length < MANUAL_PLATFORMS.length;
      const lastRowFilled = next[next.length - 1].platform !== '';
      if (canAddMore && lastRowFilled) {
        next.push({ platform: '', price: '' });
      }
      return next;
    });
  }

  function setRowPrice(index: number, price: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, price } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ platform: '', price: '' }];
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const filled = rows.filter((r): r is { platform: PlatformValue; price: string } => r.platform !== '');
    if (filled.some((r) => !r.price || Number(r.price) < 5)) {
      setError('Enter a price of at least $5.00 for each platform you add.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/curator/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: params.token,
        username,
        password,
        displayName,
        listings: filled.map((r) => ({
          platform: r.platform,
          priceCents: Math.round(Number(r.price) * 100),
        })),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    router.push('/curator/dashboard/onboarding');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Finish your signup</h1>
      <p className="mb-8 text-sm text-muted">
        Choose a username and password, then set your price on any platforms you want to list
        right away. Adding a platform reveals another row so you can list as many as you have.
        You can add or change these later from your dashboard.
      </p>
      <Card>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Your pricing</Label>
            <p className="mb-2 text-xs text-muted">
              Instagram, Facebook Reels, TikTok, and YouTube Shorts require verifying the
              account first — connect them from your dashboard after signing up.
            </p>
            <div className="space-y-2">
              {rows.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      aria-label="Platform"
                      value={row.platform}
                      onChange={(e) => setRowPlatform(index, e.target.value as PlatformValue | '')}
                    >
                      <option value="">Select a platform (optional)</option>
                      {platformOptionsFor(index).map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
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
                      disabled={!row.platform}
                      value={row.price}
                      onChange={(e) => setRowPrice(index, e.target.value)}
                    />
                  </div>
                  {(row.platform !== '' || rows.length > 1) && (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="px-1 text-sm text-muted hover:text-ink"
                      aria-label="Remove platform"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
