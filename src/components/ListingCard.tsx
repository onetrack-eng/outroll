import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { formatCents, platformLabel, genreLabel } from '@/lib/constants';
import { gradientForSeed } from '@/lib/gradients';
import type { VerifiedConnection } from '@/lib/verifiedFollowerCounts';

export interface ListingCardData {
  id: string;
  platform: string;
  genre: string;
  priceCents: number;
  curator: {
    id: string;
    displayName: string;
    followerCount: number;
    profilePhotoUrl?: string | null;
  };
  // Present when this platform has a verified OAuth connection — takes priority over the
  // curator's self-reported followerCount, which only covers whichever platform they applied
  // under. `followerCount: null` means ownership is verified but the platform has no
  // follower-count API (Snapchat today); the card itself just shows "Verified" with no number —
  // the clickable link to the real profile (`verified.profileUrl`) lives on the listing detail
  // page instead, since this whole card is already one big link and anchors can't nest.
  verified?: VerifiedConnection;
}

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const verified = listing.verified !== undefined;
  const followerCount = verified ? listing.verified!.followerCount : listing.curator.followerCount;
  const photoUrl = listing.curator.profilePhotoUrl;

  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="h-full overflow-hidden rounded-2xl border border-line bg-mist transition-shadow hover:shadow-md">
        <div
          className="relative flex aspect-[4/3] items-center justify-center"
          style={photoUrl ? undefined : { background: gradientForSeed(`${listing.curator.id}:${listing.platform}`) }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- stored as a data URL, not a remote src
            <img src={photoUrl} alt={listing.curator.displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-6xl font-semibold text-white/30">
              {listing.curator.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            <Badge className="bg-white/90 text-paper backdrop-blur-sm">
              {platformLabel(listing.platform)}
            </Badge>
            <Badge className="bg-white/90 text-paper backdrop-blur-sm">
              {genreLabel(listing.genre)}
            </Badge>
          </div>
        </div>
        <div className="p-5">
          <div className="mb-1 text-lg font-semibold text-ink">{listing.curator.displayName}</div>
          <div className="mb-4 text-sm text-muted">
            {followerCount !== null && `${followerCount.toLocaleString('en-US')} followers`}
            {followerCount !== null && verified && ' · '}
            {verified && 'Verified'}
          </div>
          <div className="text-2xl font-semibold tracking-tight text-ink">
            {formatCents(listing.priceCents)}
          </div>
        </div>
      </div>
    </Link>
  );
}
