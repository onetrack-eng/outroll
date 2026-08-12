import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-line py-10">
      <div className="mx-auto flex max-w-content items-center justify-between px-6 text-xs text-muted">
        <p>Outroll — curated music promotion, done cleanly. Powered by OneTrack Media Inc.</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-ink">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms of Service
          </Link>
          <Link href="/data-deletion" className="hover:text-ink">
            Data Deletion
          </Link>
        </div>
      </div>
    </footer>
  );
}
