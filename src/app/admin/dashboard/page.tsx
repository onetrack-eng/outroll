import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/AdminNav';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCents } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const [campaignCount, holds, pendingApplications, openDisputes] = await Promise.all([
    prisma.campaign.count(),
    prisma.hold.findMany({ include: { curator: true, campaign: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.curatorApplication.count({ where: { status: 'PENDING' } }),
    prisma.dispute.count({ where: { status: 'OPEN' } }),
  ]);

  const allHolds = await prisma.hold.findMany();
  const totalCharged = allHolds.reduce((s, h) => s + h.totalChargeCents, 0);
  const totalFees = allHolds.reduce((s, h) => s + h.platformFeeCents, 0);

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <AdminNav />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Overview</h1>

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <div className="text-xs uppercase text-muted">Campaigns</div>
          <div className="mt-1 text-2xl font-semibold">{campaignCount}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-muted">Total charged</div>
          <div className="mt-1 text-2xl font-semibold">{formatCents(totalCharged)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-muted">Platform fees</div>
          <div className="mt-1 text-2xl font-semibold">{formatCents(totalFees)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-muted">Needs attention</div>
          <div className="mt-1 text-2xl font-semibold">{pendingApplications + openDisputes}</div>
          <div className="text-xs text-muted">
            {pendingApplications} application{pendingApplications === 1 ? '' : 's'}, {openDisputes} dispute
            {openDisputes === 1 ? '' : 's'}
          </div>
        </Card>
      </div>

      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted">Recent holds</h2>
      <div className="space-y-3">
        {holds.map((hold) => (
          <Card key={hold.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium text-ink">
                {hold.campaign.artistName ?? hold.campaign.artistEmail} → {hold.curator.displayName}
              </div>
              <div className="text-sm text-muted">{formatCents(hold.totalChargeCents)}</div>
            </div>
            <StatusBadge status={hold.status} />
          </Card>
        ))}
      </div>
    </div>
  );
}
