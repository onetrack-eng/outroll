'use client';

import Link from 'next/link';
import { useCart } from '@/components/CartProvider';

export function Nav() {
  const { items } = useCart();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-content items-center justify-between px-6 py-5">
        <Link href="/" className="text-[15px] font-semibold tracking-tight text-ink">
          Outroll
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted">
          <Link href="/browse" className="hover:text-ink">
            Browse
          </Link>
          <Link href="/apply" className="hover:text-ink">
            Become a curator
          </Link>
          <Link href="/curator/login" className="hover:text-ink">
            Curator login
          </Link>
          <Link
            href="/checkout"
            className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper hover:opacity-90"
          >
            Your campaign{items.length > 0 ? ` (${items.length})` : ''}
          </Link>
        </nav>
      </div>
    </header>
  );
}
