// Client-side Sentry init — loaded automatically by the Sentry webpack plugin (see next.config.js).
// Self-disables gracefully when NEXT_PUBLIC_SENTRY_DSN is unset (e.g. local dev), so this file
// is always safe to ship even before a DSN is configured.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  debug: false,
});
