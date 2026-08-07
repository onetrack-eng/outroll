import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/AdminNav';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCents } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function AdminCampaignsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const campaigns = await prisma.campaign.findMany({
    include: { holds: { include: { curator: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <AdminNav />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Campaigns</h1>

      <div className="space-y-4">
        {campaigns.map((c) => {
          const total = c.holds.reduce((s, h) => s + h.totalChargeCents, 0);
          return (
            <Card key={c.id}>
              <div className="mb-3 flex items-center justify-between">
                <div className="font-medium text-ink">{c.artistName ?? c.artistEmail}</div>
                <div className="text-sm text-muted">{formatCents(total)} total</div>
              </div>
              <div className="space-y-2">
                {c.holds.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted">{h.curator.displayName}</span>
                    <StatusBadge status={h.status} />
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {campaigns.length === 0 && <p className="text-muted">No campaigns yet.</p>}
      </div>
    </div>
  );
}
