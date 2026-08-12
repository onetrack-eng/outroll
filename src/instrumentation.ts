import * as Sentry from '@sentry/nextjs';

// Server + edge runtime init (covers route handlers, server components, and middleware.ts on
// the Edge runtime) -- this is Sentry's current recommended pattern for Next.js, replacing the
// older sentry.server.config.ts/sentry.edge.config.ts files. Browser-side init is separate, in
// sentry.client.config.ts (loaded by the Sentry webpack plugin, not this hook). Self-disables
// gracefully when NEXT_PUBLIC_SENTRY_DSN is unset.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.2,
      debug: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
