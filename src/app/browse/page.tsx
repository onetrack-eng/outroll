import { prisma } from '@/lib/db';
import { ListingCard } from '@/components/ListingCard';
import { Filters } from '@/components/Filters';
import { verifiedFollowerCountsFor } from '@/lib/verifiedFollowerCounts';

export const dynamic = 'force-dynamic';

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { platform?: string; genre?: string; sort?: string };
}) {
  const { platform, genre, sort } = searchParams;

  const listings = await prisma.listing.findMany({
    where: {
      isPaused: false,
      ...(platform ? { platform: platform as any } : {}),
      ...(genre ? { genre: genre as any } : {}),
    },
    include: {
      curator: { select: { id: true, displayName: true, followerCount: true } },
    },
    orderBy: { priceCents: sort === 'desc' ? 'desc' : 'asc' },
  });

  const verifiedCounts = await verifiedFollowerCountsFor(listings);

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <div className="mb-12 max-w-2xl">
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-ink">
          Browse curators
        </h1>
        <p className="text-lg text-muted">
          Filter by platform, genre, and price. Pay only once your promo is confirmed live.
        </p>
      </div>

      <Filters platform={platform} genre={genre} sort={sort} />

      {listings.length === 0 ? (
        <p className="py-20 text-center text-muted">No listings match those filters yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={{
                ...listing,
                verifiedFollowerCount: verifiedCounts.get(`${listing.curatorId}:${listing.platform}`),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
