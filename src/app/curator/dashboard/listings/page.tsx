import { getCuratorSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { GatedListingForm } from '@/components/GatedListingForm';
import { ListingRow } from '@/components/ListingRow';
import { DisconnectButton } from '@/components/DisconnectButton';
import {
  platformLabel,
  GATED_PLATFORMS,
  TWITTER_X_COMING_SOON,
  PROFILE_URL_BASE,
} from '@/lib/constants';
import { START_ROUTE_SEGMENT } from '@/lib/socialAuth';

export const dynamic = 'force-dynamic';

export default async function CuratorListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; connection_error?: string }>;
}) {
  const { connected, connection_error } = await searchParams;
  const session = await getCuratorSession();
  if (!session) redirect('/curator/login');

  const [listings, connections] = await Promise.all([
    prisma.listing.findMany({ where: { curatorId: session.sub }, orderBy: { createdAt: 'desc' } }),
    prisma.socialConnection.findMany({ where: { curatorId: session.sub } }),
  ]);

  const connectionByPlatform = Object.fromEntries(connections.map((c) => [c.platform, c]));
  const listedGatedPlatforms = new Set(listings.map((l) => l.platform));

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Your listings</h1>

      {connected && (
        <p className="mb-6 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          {platformLabel(connected)} connected and verified.
        </p>
      )}
      {connection_error && (
        <p className="mb-6 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {connection_error}
        </p>
      )}

      <Card className="mb-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted">
          Verified accounts
        </h2>
        <div className="space-y-3">
          {GATED_PLATFORMS.map((platform) => {
            const connection = connectionByPlatform[platform];
            return (
              <div
                key={platform}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3"
              >
                <div>
                  <div className="font-medium text-ink">{platformLabel(platform)}</div>
                  {connection ? (
                    <div className="text-sm text-muted">
                      {connection.externalHandle &&
                        (connection.followerCount === null ? (
                          <a
                            href={`${PROFILE_URL_BASE[platform]}${connection.externalHandle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-ink"
                          >
                            @{connection.externalHandle}
                          </a>
                        ) : (
                          `@${connection.externalHandle}`
                        ))}
                      {connection.externalHandle && ' · '}
                      {connection.followerCount !== null &&
                        `${connection.followerCount.toLocaleString('en-US')} followers · `}
                      Verified
                    </div>
                  ) : (
                    <div className="text-sm text-muted">Not connected</div>
                  )}
                </div>
                {connection ? (
                  <div className="flex items-center gap-3">
                    {listedGatedPlatforms.has(platform) ? (
                      <Badge tone="neutral">Listed</Badge>
                    ) : (
                      <GatedListingForm platform={platform} />
                    )}
                    <DisconnectButton
                      routeSegment={START_ROUTE_SEGMENT[platform]}
                      hasListing={listedGatedPlatforms.has(platform)}
                    />
                  </div>
                ) : (
                  <a
                    href={`/api/curator/connections/${START_ROUTE_SEGMENT[platform]}/start`}
                    className="rounded-lg border border-ink px-3.5 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-paper"
                  >
                    Connect
                  </a>
                )}
              </div>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 opacity-60">
            <div>
              <div className="font-medium text-ink">{TWITTER_X_COMING_SOON.label}</div>
              <div className="text-sm text-muted">Not available yet</div>
            </div>
            <Badge tone="neutral">Coming soon</Badge>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {listings.map((listing) => (
          <ListingRow
            key={listing.id}
            id={listing.id}
            platform={listing.platform}
            genre={listing.genre}
            priceCents={listing.priceCents}
            isPaused={listing.isPaused}
          />
        ))}
        {listings.length === 0 && <p className="text-muted">No listings yet — add one above.</p>}
      </div>
    </div>
  );
}
