import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { AddToCampaignForm } from '@/components/AddToCampaignForm';
import { formatCents, platformLabel, genreLabel } from '@/lib/constants';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { curator: true },
  });

  if (!listing || listing.isPaused) notFound();

  const connection = await prisma.socialConnection.findUnique({
    where: { curatorId_platform: { curatorId: listing.curatorId, platform: listing.platform } },
  });
  const followerCount = connection?.followerCount ?? listing.curator.followerCount;
  const verified = connection !== null;

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Badge>{platformLabel(listing.platform)}</Badge>
            <Badge tone="neutral">{genreLabel(listing.genre)}</Badge>
          </div>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-ink">
            {listing.curator.displayName}
          </h1>
          <Link
            href={`/curators/${listing.curator.id}`}
            className="text-sm text-muted underline underline-offset-2 hover:text-ink"
          >
            {followerCount.toLocaleString('en-US')} followers{verified ? ' (verified)' : ''} — view profile
          </Link>

          <div className="mt-10 text-4xl font-semibold tracking-tight text-ink">
            {formatCents(listing.priceCents)}
          </div>
          <p className="mt-2 text-sm text-muted">
            Charged at checkout: {formatCents(Math.round(listing.priceCents * 1.2))} (includes
            platform fee). Funds are held until the promo is confirmed live.
          </p>
        </div>

        <div>
          <Card>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted">
              Submit a pitch
            </h2>
            <AddToCampaignForm
              listingId={listing.id}
              curatorDisplayName={listing.curator.displayName}
              platformLabel={platformLabel(listing.platform)}
              genre={genreLabel(listing.genre)}
              priceCents={listing.priceCents}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
