import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-line py-10">
      <div className="mx-auto flex max-w-content items-center justify-between px-6 text-xs text-muted">
        <p>Outroll — curated music promotion, done cleanly.</p>
        <Link href="/privacy" className="hover:text-ink">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
