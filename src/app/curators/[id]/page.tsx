import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ListingCard } from '@/components/ListingCard';
import { Avatar } from '@/components/ui/Avatar';
import { genreLabel } from '@/lib/constants';
import { verifiedFollowerCountsFor } from '@/lib/verifiedFollowerCounts';

export const dynamic = 'force-dynamic';

export default async function CuratorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const curator = await prisma.curator.findUnique({
    where: { id },
    include: { listings: { where: { isPaused: false } } },
  });

  if (!curator) notFound();

  const verifiedCounts = await verifiedFollowerCountsFor(curator.listings);

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <div className="mb-2 flex items-center gap-4">
        <Avatar photoUrl={curator.profilePhotoUrl} seed={curator.id} name={curator.displayName} size={56} />
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{curator.displayName}</h1>
      </div>
      <p className="mb-10 text-muted">
        {curator.followerCount.toLocaleString('en-US')} followers · {genreLabel(curator.genre)}
      </p>

      {curator.listings.length === 0 ? (
        <p className="text-muted">This curator has no active listings right now.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {curator.listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={{
                id: listing.id,
                platform: listing.platform,
                genre: listing.genre,
                priceCents: listing.priceCents,
                curator: {
                  id: curator.id,
                  displayName: curator.displayName,
                  followerCount: curator.followerCount,
                  profilePhotoUrl: curator.profilePhotoUrl,
                },
                verified: verifiedCounts.get(`${curator.id}:${listing.platform}`),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
