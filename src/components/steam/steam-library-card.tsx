import Link from "next/link";
import { GameCover } from "@/components/games/game-cover";
import { LibraryEntryForm } from "@/components/library/library-entry-form";
import { Badge } from "@/components/ui/badge";
import type { LibraryEntry } from "@/lib/library";
import type { SteamLibraryItem } from "@/lib/steam";

export function SteamLibraryCard({
  item,
  journalAvailable,
  journalEntry,
  priority = false,
}: {
  item: SteamLibraryItem;
  journalAvailable: boolean;
  journalEntry: LibraryEntry | null;
  priority?: boolean;
}) {
  const game = item.game;

  return (
    <li>
      <article className="flex flex-col gap-4 rounded-xl border border-edge bg-surface p-4 shadow-card">
        <div className="flex gap-4">
          {game ? (
            <Link
              href={`/games/${game.igdb_id}`}
              aria-label={`View ${game.name}`}
              className="h-31.25 w-22 shrink-0 rounded-lg"
            >
              <GameCover game={game} priority={priority} />
            </Link>
          ) : (
            <div
              aria-hidden
              className="flex h-31.25 w-22 shrink-0 items-center justify-center rounded-lg border border-edge bg-elevated p-2 text-center"
            >
              <span className="line-clamp-4 text-meta text-fg-muted">{item.steam_name}</span>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                {game ? (
                  <Link href={`/games/${game.igdb_id}`} className="text-title text-fg hover:text-brand">
                    {game.name}
                  </Link>
                ) : (
                  <h3 className="text-title text-fg">{item.steam_name}</h3>
                )}
                {game && game.name !== item.steam_name && (
                  <p className="mt-1 text-meta text-fg-muted">Steam: {item.steam_name}</p>
                )}
              </div>
              <Badge tone={game ? "success" : "neutral"}>
                {game ? "Matched" : "Unmatched"}
              </Badge>
            </div>

            <dl className="grid gap-1 text-meta text-fg-muted">
              <div className="flex gap-1">
                <dt>Playtime:</dt>
                <dd className="text-fg">{formatPlaytime(item.playtime_minutes)}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Steam App ID:</dt>
                <dd className="text-fg">{item.steam_app_id}</dd>
              </div>
            </dl>
          </div>
        </div>

        {game && journalAvailable ? (
          <div className="border-t border-edge pt-4">
            <LibraryEntryForm
              key={journalEntry?.updated_at ?? `steam-${item.steam_app_id}`}
              gameId={game.igdb_id}
              gameName={game.name}
              initialEntry={journalEntry}
            />
          </div>
        ) : game ? (
          <p className="border-t border-edge pt-3 text-meta text-warning">
            Journal controls are temporarily unavailable. Refresh the page before adding or editing this game.
          </p>
        ) : (
          <p className="border-t border-edge pt-3 text-meta text-fg-muted">
            This Steam title has no IGDB match, so it cannot be added to a Playlog journal yet.
          </p>
        )}
      </article>
    </li>
  );
}

function formatPlaytime(minutes: number) {
  if (minutes === 0) return "No recorded playtime";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}
