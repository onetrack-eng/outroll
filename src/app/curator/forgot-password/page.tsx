'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/curator/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    // Always show the same confirmation, regardless of whether the email matched an account —
    // the API deliberately never reveals that either, to avoid leaking which emails are registered.
    setSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mb-8 text-sm text-muted">
        Enter the email on your curator account and we&rsquo;ll send you a link to reset your
        password.
      </p>
      <Card>
        {submitted ? (
          <p className="text-sm text-ink">
            If that email is associated with a curator account, we&rsquo;ve sent a password reset
            link. It expires in 1 hour.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
      </Card>
      <p className="mt-6 text-center text-sm text-muted">
        <a href="/curator/login" className="text-ink underline">
          Back to login
        </a>
      </p>
    </div>
  );
}
