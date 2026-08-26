import type { GameStats } from "@/lib/api/server";

const STATUS_LABELS = [
  ["total_logged", "Total logged"],
  ["backlog", "Backlog"],
  ["playing", "Playing"],
  ["completed", "Completed"],
  ["dropped", "Dropped"],
  ["rating_count", "Ratings"],
] as const;

/**
 * Community statistics. Zero counts are legitimate values and render as-is.
 * average_rating === null means "not rated yet" — deliberately distinct from
 * a zero rating, so it renders as text instead of a star value.
 */
export function StatsGrid({ stats }: { stats: GameStats }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {STATUS_LABELS.map(([key, label]) => (
        <div key={key} className="rounded-lg border border-edge bg-surface p-3 text-center">
          <dt className="text-meta text-fg-muted">{label}</dt>
          <dd className="text-headline text-fg" aria-label={`${label}: ${stats[key]}`}>
            {stats[key]}
          </dd>
        </div>
      ))}
      <div className="rounded-lg border border-edge bg-surface p-3 text-center">
        <dt className="text-meta text-fg-muted">Average rating</dt>
        <dd className="text-headline text-fg" aria-label={stats.average_rating === null ? "Average rating: not rated yet" : `Average rating: ${stats.average_rating.toFixed(1)} out of 5`}>
          {stats.average_rating === null ? (
            <span className="text-title text-fg-muted">Not rated yet</span>
          ) : (
            <>
              {stats.average_rating.toFixed(1)}
              <span className="text-title text-fg-muted"> / 5</span>
            </>
          )}
        </dd>
      </div>
    </dl>
  );
}
