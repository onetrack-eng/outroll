import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCents, platformLabel, genreLabel } from '@/lib/constants';
import { isPast } from '@/lib/businessDays';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

export default async function ArtistDashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { magicLinkToken: token },
    include: {
      holds: {
        include: { curator: true, listing: true, dispute: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!campaign) notFound();

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Your campaign</h1>
      <p className="mb-10 text-muted">
        {campaign.artistName ?? campaign.artistEmail} · started{' '}
        {dateFmt.format(campaign.createdAt)}
      </p>

      <div className="space-y-4">
        {campaign.holds.map((hold) => {
          const disputeEligible =
            hold.status === 'POSTED' &&
            hold.payoutReleaseAt &&
            !isPast(hold.payoutReleaseAt);

          return (
            <Card key={hold.id}>
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge>{platformLabel(hold.listing.platform)}</Badge>
                    <Badge tone="neutral">{genreLabel(hold.listing.genre)}</Badge>
                  </div>
                  <div className="text-lg font-medium text-ink">{hold.curator.displayName}</div>
                </div>
                <div className="text-right">
                  <StatusBadge status={hold.status} />
                  <div className="mt-1 text-sm text-muted">
                    {formatCents(hold.totalChargeCents)}
                  </div>
                </div>
              </div>

              {hold.postUrl && (
                <a
                  href={hold.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-2 block text-sm text-ink underline"
                >
                  View live post
                </a>
              )}

              {hold.status === 'DISPUTED' && (
                <p className="text-sm text-danger">
                  Dispute under review — we&rsquo;ll email you once it&rsquo;s resolved.
                </p>
              )}

              {disputeEligible && (
                <Link
                  href={`/dashboard/${token}/dispute/${hold.id}`}
                  className="text-sm text-ink underline"
                >
                  Something wrong? File a dispute →
                </Link>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
