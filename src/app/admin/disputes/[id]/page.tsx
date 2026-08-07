import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import { AdminNav } from '@/components/AdminNav';
import { Card } from '@/components/ui/Card';
import { AdminDisputeResolve } from '@/components/AdminDisputeResolve';
import { formatCents } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function AdminDisputeDetailPage({ params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const dispute = await prisma.dispute.findUnique({
    where: { id: params.id },
    include: { hold: { include: { curator: true, campaign: true, listing: true } } },
  });
  if (!dispute) notFound();

  const { hold } = dispute;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <AdminNav />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Dispute</h1>

      <Card className="mb-6 space-y-3">
        <div>
          <div className="text-xs uppercase text-muted">Artist</div>
          <div className="text-sm text-ink">{hold.campaign.artistName ?? hold.campaign.artistEmail}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted">Curator</div>
          <div className="text-sm text-ink">{hold.curator.displayName} ({hold.curator.email})</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted">Amount</div>
          <div className="text-sm text-ink">
            {formatCents(hold.totalChargeCents)} total — curator receives {formatCents(hold.priceCents)}
          </div>
        </div>
        {hold.postUrl && (
          <div>
            <div className="text-xs uppercase text-muted">Live post</div>
            <a href={hold.postUrl} target="_blank" rel="noreferrer" className="text-sm text-ink underline break-all">
              {hold.postUrl}
            </a>
          </div>
        )}
        <div>
          <div className="text-xs uppercase text-muted">Dispute reason</div>
          <p className="whitespace-pre-wrap text-sm text-ink">{dispute.reason}</p>
        </div>
      </Card>

      {dispute.status === 'OPEN' ? (
        <Card>
          <AdminDisputeResolve disputeId={dispute.id} />
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted">
            Resolved: {dispute.resolution === 'CURATOR_PAID' ? 'Curator paid in full' : 'Artist refunded in full'}
          </p>
        </Card>
      )}
    </div>
  );
}
