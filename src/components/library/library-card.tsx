import Link from "next/link";
import { GameCover } from "@/components/games/game-cover";
import { LibraryEntryForm } from "@/components/library/library-entry-form";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { releaseYear } from "@/lib/games";
import {
  LIBRARY_STATUS_LABELS,
  type LibraryEntry,
  type LibraryStatus,
} from "@/lib/library";

const STATUS_TONES: Record<LibraryStatus, BadgeTone> = {
  backlog: "neutral",
  playing: "brand",
  completed: "success",
  dropped: "danger",
};

export function LibraryCard({
  entry,
  priority = false,
}: {
  entry: LibraryEntry;
  priority?: boolean;
}) {
  const year = entry.game.first_release_date
    ? releaseYear(entry.game.first_release_date)
    : null;

  return (
    <li>
      <article className="flex flex-col gap-5 rounded-xl border border-edge bg-surface p-4 shadow-card">
        <div className="flex gap-4">
          <Link
            href={`/games/${entry.game.igdb_id}`}
            aria-label={`View ${entry.game.name}`}
            className="w-22 shrink-0 self-start rounded-lg"
            style={{ aspectRatio: "132 / 187" }}
          >
            <GameCover game={entry.game} priority={priority} />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link
                  href={`/games/${entry.game.igdb_id}`}
                  className="text-title text-fg hover:text-brand"
                >
                  {entry.game.name}
                </Link>
                {year !== null && (
                  <p className="text-meta text-fg-muted">{year}</p>
                )}
              </div>
              <Badge tone={STATUS_TONES[entry.status]}>
                {LIBRARY_STATUS_LABELS[entry.status]}
              </Badge>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-meta">
              <div>
                <dt className="text-fg-muted">Rating</dt>
                <dd className="text-fg">
                  {entry.rating === null ? "Not rated" : `${entry.rating.toFixed(1)} / 5`}
                </dd>
              </div>
              <div>
                <dt className="text-fg-muted">Dates</dt>
                <dd className="text-fg">
                  {formatDateRange(entry.started_at, entry.completed_at)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {entry.review && (
          <blockquote className="border-l-2 border-brand/60 pl-3 text-label text-fg-muted">
            <p className="line-clamp-3 whitespace-pre-line">{entry.review}</p>
          </blockquote>
        )}

        <div className="border-t border-edge pt-4">
          <LibraryEntryForm
            key={entry.updated_at}
            gameId={entry.game.igdb_id}
            gameName={entry.game.name}
            initialEntry={entry}
          />
        </div>
      </article>
    </li>
  );
}

function formatDateRange(startedAt: string | null, completedAt: string | null) {
  if (startedAt && completedAt) {
    return `${formatDate(startedAt)} – ${formatDate(completedAt)}`;
  }
  if (startedAt) {
    return `Started ${formatDate(startedAt)}`;
  }
  if (completedAt) {
    return `Completed ${formatDate(completedAt)}`;
  }
  return "Not recorded";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
