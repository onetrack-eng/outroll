import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/Button';
import { platformLabel, genreLabel } from '@/lib/constants';
import { gradientForSeed } from '@/lib/gradients';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    color: 'bg-coral',
    title: 'Browse',
    body: 'Filter independent curators by platform, genre, and price to build your campaign.',
  },
  {
    color: 'bg-violet',
    title: 'Pitch',
    body: 'Submit your visual assets and the story you want the post built around.',
  },
  {
    color: 'bg-teal',
    title: 'Get posted',
    body: 'Funds stay held until your promo is confirmed live — pay only when it happens.',
  },
] as const;

export default async function HomePage() {
  const previewListings = await prisma.listing.findMany({
    where: { isPaused: false },
    include: { curator: { select: { id: true, displayName: true, profilePhotoUrl: true } } },
    orderBy: { createdAt: 'desc' },
    take: 4,
  });

  return (
    <div>
      <section className="mx-auto max-w-content px-6 pb-20 pt-20 text-center">
        <h1 className="mx-auto mb-5 max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-ink sm:text-6xl">
          Get your music in front of the right people.
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-lg text-muted">
          Browse independent curators across Instagram, TikTok, YouTube Shorts, Twitter/X,
          Snapchat, and more. Pay only once your promo is confirmed live.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/browse">
            <Button>Browse curators</Button>
          </Link>
          <Link href="/apply">
            <Button variant="secondary">Become a curator</Button>
          </Link>
        </div>
      </section>

      {previewListings.length > 0 && (
        <section className="mx-auto max-w-content px-6 pb-24">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {previewListings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="group overflow-hidden rounded-2xl border border-line"
              >
                <div
                  className="flex aspect-square items-center justify-center transition-transform group-hover:scale-105"
                  style={
                    listing.curator.profilePhotoUrl
                      ? undefined
                      : { background: gradientForSeed(`${listing.curator.id}:${listing.platform}`) }
                  }
                >
                  {listing.curator.profilePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- stored as a data URL, not a remote src
                    <img
                      src={listing.curator.profilePhotoUrl}
                      alt={listing.curator.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-semibold text-white/30">
                      {listing.curator.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-medium text-ink">
                    {listing.curator.displayName}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {platformLabel(listing.platform)} · {genreLabel(listing.genre)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-line bg-mist py-24">
        <div className="mx-auto max-w-content px-6">
          <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight text-ink">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full ${step.color} text-sm font-semibold text-white`}
                >
                  {i + 1}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="text-sm text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-6 py-24 text-center">
        <div
          className="rounded-3xl px-8 py-16"
          style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 55%, #FF6B4A 100%)' }}
        >
          <h2 className="mb-3 text-3xl font-semibold tracking-tight text-white">
            Run a page with an audience?
          </h2>
          <p className="mx-auto mb-8 max-w-md text-white/90">
            Set your own price, get paid once you post — no auto-approval, every application
            reviewed by hand.
          </p>
          <Link href="/apply">
            <Button className="!bg-white !text-paper hover:!bg-white/90">Apply to curate</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
