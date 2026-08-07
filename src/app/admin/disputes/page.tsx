import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminNav } from '@/components/AdminNav';
import { Card } from '@/components/ui/Card';
import { formatCents } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function AdminDisputesPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const disputes = await prisma.dispute.findMany({
    where: { status: 'OPEN' },
    include: { hold: { include: { curator: true, campaign: true } } },
    orderBy: { filedAt: 'asc' },
  });

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <AdminNav />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Open disputes</h1>

      {disputes.length === 0 ? (
        <p className="text-muted">No open disputes.</p>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <Link key={d.id} href={`/admin/disputes/${d.id}`}>
              <Card className="hover:shadow-sm">
                <div className="font-medium text-ink">
                  {d.hold.campaign.artistName ?? d.hold.campaign.artistEmail} vs {d.hold.curator.displayName}
                </div>
                <div className="text-sm text-muted">
                  {formatCents(d.hold.totalChargeCents)} · filed {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d.filedAt)}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
