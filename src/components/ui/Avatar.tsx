import { gradientForSeed } from '@/lib/gradients';

// Small circular avatar for curator identity — used wherever a curator's photo would sit next
// to their name (profile page, listing detail). ListingCard has its own larger, cover-art-style
// treatment for the same photo since that's a different visual role (a big preview tile, not an
// identity marker). Falls back to a colored initial when no photo has been connected yet.
export function Avatar({
  photoUrl,
  seed,
  name,
  size = 40,
}: {
  photoUrl?: string | null;
  seed: string;
  name: string;
  size?: number;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- stored as a data URL, not a remote src
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-white/80"
      style={{ width: size, height: size, background: gradientForSeed(seed), fontSize: size * 0.4 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
