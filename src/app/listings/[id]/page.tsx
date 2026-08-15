import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { AddToCampaignForm } from '@/components/AddToCampaignForm';
import { formatCents, platformLabel, genreLabel, isGatedPlatform, PROFILE_URL_BASE } from '@/lib/constants';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { curator: true },
  });

  if (!listing || listing.isPaused) notFound();

  const connection = await prisma.socialConnection.findUnique({
    where: { curatorId_platform: { curatorId: listing.curatorId, platform: listing.platform } },
  });
  const verified = connection !== null;
  // connection.followerCount is null for a verified-but-count-less platform (Snapchat) — show
  // no number rather than falling back to the curator's unrelated self-reported count.
  const followerCount = verified ? connection.followerCount : listing.curator.followerCount;
  // No follower-count API for this platform (Snapchat today) — link straight to the real
  // profile instead, so a buyer who wants a number can go see it themselves.
  const externalProfileUrl =
    verified && followerCount === null && connection.externalHandle && isGatedPlatform(listing.platform)
      ? `${PROFILE_URL_BASE[listing.platform]}${connection.externalHandle}`
      : null;

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Badge>{platformLabel(listing.platform)}</Badge>
            <Badge tone="neutral">{genreLabel(listing.genre)}</Badge>
          </div>
          <div className="mb-2 flex items-center gap-3">
            <Avatar
              photoUrl={listing.curator.profilePhotoUrl}
              seed={listing.curator.id}
              name={listing.curator.displayName}
              size={44}
            />
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              {listing.curator.displayName}
            </h1>
          </div>
          <Link
            href={`/curators/${listing.curator.id}`}
            className="text-sm text-muted underline underline-offset-2 hover:text-ink"
          >
            {followerCount !== null && `${followerCount.toLocaleString('en-US')} followers`}
            {followerCount !== null && verified && ' '}
            {verified && '(verified)'} — view profile
          </Link>
          {externalProfileUrl && (
            <a
              href={externalProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 text-sm text-muted underline underline-offset-2 hover:text-ink"
            >
              View on {platformLabel(listing.platform)} →
            </a>
          )}

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
