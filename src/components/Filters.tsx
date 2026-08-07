import { PLATFORMS, GENRES } from '@/lib/constants';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function Filters({
  platform,
  genre,
  sort,
}: {
  platform?: string;
  genre?: string;
  sort?: string;
}) {
  return (
    <form className="mb-10 flex flex-wrap items-end gap-4" method="get">
      <div className="w-48">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
          Platform
        </label>
        <Select name="platform" defaultValue={platform ?? ''}>
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-48">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
          Genre
        </label>
        <Select name="genre" defaultValue={genre ?? ''}>
          <option value="">All genres</option>
          {GENRES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-48">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
          Sort by price
        </label>
        <Select name="sort" defaultValue={sort ?? 'asc'}>
          <option value="asc">Low to high</option>
          <option value="desc">High to low</option>
        </Select>
      </div>
      <Button type="submit" variant="secondary">
        Apply
      </Button>
    </form>
  );
}
