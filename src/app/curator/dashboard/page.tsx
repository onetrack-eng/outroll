import Link from 'next/link';
import { getCuratorSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCents } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function CuratorDashboardPage() {
  const session = await getCuratorSession();
  if (!session) redirect('/curator/login');

  const curator = await prisma.curator.findUnique({ where: { id: session.sub } });
  if (!curator) redirect('/curator/login');

  const holds = await prisma.hold.findMany({
    where: { curatorId: curator.id },
    include: { campaign: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <div className="mb-10 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {curator.displayName}</h1>
        <div className="flex items-center gap-3">
          {!curator.stripeOnboardingComplete && (
            <Link href="/curator/dashboard/onboarding">
              <Badge tone="warning">Finish payout setup →</Badge>
            </Link>
          )}
          <Link href="/curator/dashboard/listings" className="text-sm text-ink underline">
            Manage listings
          </Link>
        </div>
      </div>

      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted">Submissions</h2>

      {holds.length === 0 ? (
        <Card>
          <p className="text-muted">No submissions yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {holds.map((hold) => (
            <Link key={hold.id} href={`/curator/dashboard/submissions/${hold.id}`}>
              <Card className="flex items-center justify-between hover:shadow-sm">
                <div>
                  <div className="font-medium text-ink">
                    {hold.campaign.artistName ?? hold.campaign.artistEmail}
                  </div>
                  <div className="text-sm text-muted">
                    {formatCents(hold.priceCents)} · submitted{' '}
                    {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(hold.createdAt)}
                  </div>
                </div>
                <StatusBadge status={hold.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
