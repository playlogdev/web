import Link from "next/link";
import { GameCover } from "@/components/games/game-cover";
import { Badge, type BadgeTone } from "@/components/ui/badge";
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

export function PublicLibraryCard({
  entry,
  priority = false,
}: {
  entry: LibraryEntry;
  priority?: boolean;
}) {
  return (
    <li>
      <article className="flex gap-4 rounded-xl border border-edge bg-surface p-4 shadow-card">
        <Link
          href={`/games/${entry.game.igdb_id}`}
          aria-label={`View ${entry.game.name}`}
          className="h-31.25 w-22 shrink-0 rounded-lg"
        >
          <GameCover game={entry.game} priority={priority} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link
              href={`/games/${entry.game.igdb_id}`}
              className="text-title text-fg hover:text-brand"
            >
              {entry.game.name}
            </Link>
            <Badge tone={STATUS_TONES[entry.status]}>
              {LIBRARY_STATUS_LABELS[entry.status]}
            </Badge>
          </div>
          <p className="text-label text-fg-muted">
            {entry.rating === null ? "Not rated" : `★ ${entry.rating.toFixed(1)} / 5`}
          </p>
          {entry.review && (
            <blockquote className="border-l-2 border-brand/60 pl-3 text-label text-fg-muted">
              <p className="line-clamp-3 whitespace-pre-line">{entry.review}</p>
            </blockquote>
          )}
        </div>
      </article>
    </li>
  );
}
