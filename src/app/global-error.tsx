'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import NextError from 'next/error';

// Next.js App Router only calls this for errors that escape every nested error.tsx boundary —
// it replaces the entire root layout, so it renders its own <html>/<body>. Sentry's standard
// pattern for App Router: report the error, then fall back to Next's built-in error page.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
