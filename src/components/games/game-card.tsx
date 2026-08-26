import Link from "next/link";
import { releaseYear, type Game } from "@/lib/games";
import { GameCover } from "@/components/games/game-cover";

/**
 * Search result card. Renders only data the API actually returns — no fake
 * ratings, playtime, or library status. The canonical link is the numeric
 * IGDB ID, never the slug.
 */
export function GameCard({ game }: { game: Game }) {
  const year = game.first_release_date ? releaseYear(game.first_release_date) : null;
  const developer = game.developers?.[0];

  return (
    <li>
      <Link
        href={`/games/${game.igdb_id}`}
        className="group flex gap-4 rounded-xl border border-edge bg-surface p-4 shadow-card transition-colors duration-150 hover:border-edge-strong focus-visible:border-edge-strong"
      >
        <div className="w-[88px] shrink-0 self-start" style={{ aspectRatio: "132 / 187" }}>
          <GameCover game={game} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-title text-fg group-hover:text-brand">{game.name}</h3>
          {year !== null && <p className="text-meta text-fg-muted">{year}</p>}
          {game.genres && game.genres.length > 0 && (
            <p className="line-clamp-1 text-meta text-fg-muted">{game.genres.join(", ")}</p>
          )}
          {developer && <p className="line-clamp-1 text-meta text-fg-muted">{developer}</p>}
        </div>
      </Link>
    </li>
  );
}
