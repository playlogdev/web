import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameCover } from "@/components/games/game-cover";
import { StatsGrid } from "@/components/games/stats-grid";
import { FriendsActivity } from "@/components/games/friends-activity";
import { LibraryEntryForm } from "@/components/library/library-entry-form";
import { Card } from "@/components/ui/card";
import { getAccessToken } from "@/lib/auth/cookies";
import { getGameDetail, listLibrary } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import { formatReleaseDate, validateIgdbId } from "@/lib/games";
import type { LibraryEntry } from "@/lib/library";

type DetailParams = { params: Promise<{ igdbId: string }> };

// A generic title avoids a second upstream request from generateMetadata.
// The page heading supplies the game-specific name after the single detail fetch.
export const metadata: Metadata = { title: "Game details" };

export default async function GameDetailPage({ params }: DetailParams) {
  const { igdbId } = await params;

  // Only canonical positive base-10 int64 IDs reach the API; anything else
  // is a local not-found without an upstream call.
  const id = validateIgdbId(igdbId);
  if (id === null) {
    notFound();
  }

  const gamePath = `/games/${id.toString()}`;
  const accessToken = await getAccessToken();
  const libraryEntryPromise: Promise<LibraryEntry | null | undefined> =
    accessToken
      ? listLibrary(accessToken)
          .then(
            (entries) =>
              entries.find((entry) => BigInt(entry.game.igdb_id) === id) ??
              null,
          )
          .catch(() => undefined)
      : Promise.resolve(undefined);

  let detail;
  try {
    detail = await getGameDetail(id, accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    return (
      <DetailShell viewerState="unknown" gamePath={gamePath}>
        <DetailFailure error={error} />
      </DetailShell>
    );
  }

  const { game, stats, friendsActivity } = detail;
  const releaseDate = game.first_release_date ? formatReleaseDate(game.first_release_date) : null;
  const libraryEntry =
    friendsActivity === null ? undefined : await libraryEntryPromise;

  return (
    <DetailShell
      viewerState={friendsActivity === null ? "anonymous" : "authenticated"}
      gamePath={gamePath}
    >
      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row">
          <div className="w-33 shrink-0 self-start sm:w-39.5" style={{ aspectRatio: "132 / 187" }}>
            <GameCover game={game} priority />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-headline text-fg sm:text-display-sm sm:leading-tight">{game.name}</h1>
            {releaseDate && <p className="text-label text-fg-muted">{releaseDate}</p>}
            {game.genres && game.genres.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Genres">
                {game.genres.map((genre) => (
                  <li key={genre}>
                    <Badge tone="neutral">{genre}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {(game.developers?.length || game.publishers?.length) && (
              <dl className="flex flex-col gap-1 text-meta">
                {game.developers && game.developers.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="text-fg-muted">Developers</dt>
                    <dd className="text-fg">{game.developers.join(", ")}</dd>
                  </div>
                )}
                {game.publishers && game.publishers.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="text-fg-muted">Publishers</dt>
                    <dd className="text-fg">{game.publishers.join(", ")}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </header>

        {game.summary && (
          <section aria-labelledby="about-heading" className="flex flex-col gap-2">
            <h2 id="about-heading" className="text-title text-fg">
              About
            </h2>
            <p className="text-label text-fg-muted">{game.summary}</p>
          </section>
        )}

        <section aria-labelledby="journal-heading" className="flex flex-col gap-3">
          <h2 id="journal-heading" className="text-title text-fg">
            Your journal
          </h2>
          {friendsActivity === null ? (
            <Card className="flex flex-col items-start gap-3">
              <p className="text-label text-fg-muted">
                Log in to add {game.name} to your library and remember your
                experience.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(gamePath)}`}
                className={buttonClasses("primary", "sm")}
              >
                Log in to add
              </Link>
            </Card>
          ) : libraryEntry === undefined ? (
            <div
              role="status"
              className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-label text-fg-muted"
            >
              Your library status could not be loaded right now. Try again
              shortly.
            </div>
          ) : (
            <Card>
              <LibraryEntryForm
                key={libraryEntry?.updated_at ?? "new-entry"}
                gameId={game.igdb_id}
                gameName={game.name}
                initialEntry={libraryEntry}
              />
            </Card>
          )}
        </section>

        <section aria-labelledby="stats-heading" className="flex flex-col gap-3">
          <h2 id="stats-heading" className="text-title text-fg">
            Community
          </h2>
          <StatsGrid stats={stats} />
          <p className="text-meta text-fg-muted">
            Counts come from every Playlog player&apos;s library.
          </p>
        </section>

        <FriendsActivity activity={friendsActivity} gamePath={gamePath} />
      </article>
    </DetailShell>
  );
}

/**
 * Minimal public chrome: brand header with a way back, and sign-in/sign-up
 * calls to action for logged-out visitors. The authenticated sidebar is
 * intentionally not duplicated here.
 */
function DetailShell({
  viewerState,
  gamePath,
  children,
}: {
  viewerState: "authenticated" | "anonymous" | "unknown";
  gamePath: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-edge bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-3 px-4">
          <Logo href="/" />
          <nav aria-label="Site" className="flex items-center gap-2">
            {viewerState === "authenticated" && (
              <>
                <Link href="/discover" className="text-label text-fg-muted hover:text-fg focus-visible:text-fg">
                  Discover
                </Link>
                <Link href="/home" className={buttonLinkClasses}>
                  Your journal
                </Link>
              </>
            )}
            {viewerState === "anonymous" && (
              <>
                <Link
                  href={`/login?next=${encodeURIComponent(gamePath)}`}
                  className="text-label text-fg-muted hover:text-fg focus-visible:text-fg"
                >
                  Log in
                </Link>
                <Link href="/signup" className={buttonClasses("primary", "sm")}>
                  Sign up
                </Link>
              </>
            )}
            {viewerState === "unknown" && (
              <Link href="/" className={buttonLinkClasses}>
                Back to Playlog
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-edge">
        <div className="mx-auto flex h-12 w-full max-w-4xl items-center justify-center">
          <p className="text-meta text-fg-muted">Playlog — Track. Rate. Remember.</p>
        </div>
      </footer>
    </div>
  );
}

const buttonLinkClasses = buttonClasses("secondary", "sm");

function DetailFailure({ error }: { error: unknown }) {
  let title = "Couldn’t load game details";
  let message = "Something went wrong. Try this page again in a moment.";

  if (error instanceof ApiError && error.status === 429) {
    title = "Too many requests";
    message = error.retryAfter
      ? `Try again in ${Math.ceil(error.retryAfter)} second${error.retryAfter === 1 ? "" : "s"}.`
      : "Wait a minute, then try again.";
  } else if (error instanceof ApiError && error.status === 503) {
    title = "Game details are temporarily unavailable";
    message = "The game catalog cannot be reached right now. Try again shortly.";
  }

  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-5 py-6">
      <h1 className="text-title text-danger">{title}</h1>
      <p className="mt-2 text-label text-fg-muted">{message}</p>
      <Link
        href="/"
        className="mt-4 inline-flex text-label font-medium text-brand hover:underline focus-visible:underline"
      >
        Back to Playlog
      </Link>
    </div>
  );
}
