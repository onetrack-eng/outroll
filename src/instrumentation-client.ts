// Client-side Sentry init — Next.js 16 (Turbopack by default) loads this file automatically by
// its `instrumentation-client.ts` name/location convention, replacing the older
// sentry.client.config.ts pattern, which relied on the Sentry webpack plugin and is not picked
// up under Turbopack. Self-disables gracefully when NEXT_PUBLIC_SENTRY_DSN is unset (e.g. local
// dev), so this file is always safe to ship even before a DSN is configured.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
