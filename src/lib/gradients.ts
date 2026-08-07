// Curated vivid gradients used as "cover art" for listings/curators — there's no image/logo
// upload feature (see CLAUDE.md known simplifications), so a deterministic gradient per
// curator+platform stands in for one, the same way Spotify assigns a color to playlists with
// no cover. Deterministic (hashed from a seed) so a given listing always renders the same
// gradient rather than flickering between renders.
const GRADIENTS = [
  'linear-gradient(135deg, #FF6B4A 0%, #EC4899 100%)',
  'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
  'linear-gradient(135deg, #14B8A6 0%, #84CC16 100%)',
  'linear-gradient(135deg, #F5B942 0%, #FF6B4A 100%)',
  'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
  'linear-gradient(135deg, #3B82F6 0%, #14B8A6 100%)',
  'linear-gradient(135deg, #F5B942 0%, #14B8A6 100%)',
  'linear-gradient(135deg, #EC4899 0%, #F5B942 100%)',
] as const;

export function gradientForSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}
