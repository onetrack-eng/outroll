import { getCuratorSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCents } from '@/lib/constants';
import { AcceptDeclineActions, PostLinkForm } from '@/components/SubmissionActions';

export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export default async function SubmissionDetailPage({ params }: { params: { id: string } }) {
  const session = await getCuratorSession();
  if (!session) redirect('/curator/login');

  const hold = await prisma.hold.findUnique({
    where: { id: params.id },
    include: { campaign: true, listing: true, dispute: true },
  });

  if (!hold || hold.curatorId !== session.sub) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {hold.campaign.artistName ?? hold.campaign.artistEmail}
        </h1>
        <StatusBadge status={hold.status} />
      </div>

      <Card className="mb-6 space-y-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted">Asset folder</div>
          <a href={hold.assetLink} target="_blank" rel="noreferrer" className="text-sm text-ink underline break-all">
            {hold.assetLink}
          </a>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted">Narrative</div>
          <p className="whitespace-pre-wrap text-sm text-ink">{hold.narrative}</p>
        </div>
        {hold.context && (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted">
              Further explanation
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink">{hold.context}</p>
          </div>
        )}
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted">You&rsquo;ll be paid</div>
          <p className="text-sm text-ink">{formatCents(hold.priceCents)}</p>
        </div>
        {hold.postUrl && (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Live post</div>
            <a href={hold.postUrl} target="_blank" rel="noreferrer" className="text-sm text-ink underline break-all">
              {hold.postUrl}
            </a>
          </div>
        )}
      </Card>

      {hold.status === 'PENDING' && (
        <Card>
          <p className="mb-4 text-sm text-muted">
            Respond by {dateFmt.format(hold.acceptDeadline)}. No response auto-declines and
            refunds the artist.
          </p>
          <AcceptDeclineActions holdId={hold.id} />
        </Card>
      )}

      {hold.status === 'ACCEPTED' && (
        <Card>
          <p className="mb-4 text-sm text-muted">
            Post by {hold.postDeadline ? dateFmt.format(hold.postDeadline) : '—'}, then submit the
            live link below.
          </p>
          <PostLinkForm holdId={hold.id} />
        </Card>
      )}

      {hold.status === 'POSTED' && (
        <Card>
          <p className="text-sm text-muted">
            In the artist&rsquo;s one-week dispute window. Payout releases automatically at{' '}
            {hold.payoutReleaseAt ? dateFmt.format(hold.payoutReleaseAt) : '—'} if no dispute is
            filed.
          </p>
        </Card>
      )}

      {hold.status === 'DISPUTED' && hold.dispute && (
        <Card>
          <p className="text-sm text-danger">
            The artist filed a dispute on {dateFmt.format(hold.dispute.filedAt)}. Outroll is
            reviewing and will issue a binary resolution.
          </p>
        </Card>
      )}

      {hold.status === 'PAID' && (
        <Card>
          <p className="text-sm text-success">Payout released. Thanks for delivering.</p>
        </Card>
      )}

      {(hold.status === 'DECLINED' || hold.status === 'REFUNDED') && (
        <Card>
          <p className="text-sm text-muted">This hold was released and refunded to the artist.</p>
        </Card>
      )}
    </div>
  );
}
