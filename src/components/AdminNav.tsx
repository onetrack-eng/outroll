'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import clsx from 'clsx';

const links = [
  { href: '/admin/dashboard', label: 'Overview' },
  { href: '/admin/applications', label: 'Applications' },
  { href: '/admin/disputes', label: 'Disputes' },
  { href: '/admin/campaigns', label: 'Campaigns' },
];

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="mb-10 flex items-center justify-between border-b border-line pb-4">
      <nav className="flex gap-6 text-sm">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={clsx(
              'text-muted hover:text-ink',
              pathname?.startsWith(l.href) && 'font-medium text-ink'
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <button onClick={logout} className="text-sm text-muted underline">
        Log out
      </button>
    </div>
  );
}
