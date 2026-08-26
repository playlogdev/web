import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SearchForm } from "@/components/games/search-form";
import { GameCard } from "@/components/games/game-card";
import { getAccessToken } from "@/lib/auth/cookies";
import { searchGames } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import { safeInternalPath } from "@/lib/validation";
import {
  normalizeSearchQuery,
  SEARCH_RESULT_LIMIT,
  validateSearchQuery,
  type Game,
} from "@/lib/games";

export const metadata: Metadata = { title: "Discover" };

type SearchState =
  | { kind: "initial" }
  | { kind: "invalid"; reason: "empty" | "too-short" | "too-long" }
  | { kind: "results"; games: Game[]; query: string }
  | { kind: "no-results"; query: string }
  | { kind: "rate-limited"; retryAfter?: number }
  | { kind: "unavailable" }
  | { kind: "error" };

const INVALID_MESSAGES: Record<"empty" | "too-short" | "too-long", string> = {
  empty: "Enter a game name to search.",
  "too-short": "Search needs at least 2 bytes of text.",
  "too-long": "That search is too long. Shorten it and try again.",
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const rawQuery = typeof q === "string" ? q : "";
  const normalizedQuery = normalizeSearchQuery(rawQuery);
  const validation = validateSearchQuery(rawQuery);

  let state: SearchState;
  if (!validation.valid) {
    // Empty and invalid queries never reach the API.
    state =
      validation.reason === "empty"
        ? { kind: "initial" }
        : { kind: "invalid", reason: validation.reason };
  } else {
    state = await runSearch(validation.query);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-headline text-fg">Discover</h1>
          <Badge tone="neutral">Up to {SEARCH_RESULT_LIMIT} results</Badge>
        </div>
        <p className="text-label text-fg-muted">
          Find games by name to log them in your journal.
        </p>
      </header>

      <SearchForm key={normalizedQuery} initialQuery={normalizedQuery} />

      <SearchStateView state={state} />
    </div>
  );
}

async function runSearch(query: string): Promise<SearchState> {
  const nextPath = safeInternalPath(`/discover?q=${encodeURIComponent(query)}`, "/discover");
  const accessToken = await getAccessToken();

  if (!accessToken) {
    // The shell layout verified the session, so a missing token here is a
    // stale/expired state; route through the standard expired flow.
    redirectExpired(nextPath);
  }

  try {
    const games = await searchGames(accessToken, query);
    return games.length === 0
      ? { kind: "no-results", query }
      : { kind: "results", games, query };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        redirectExpired(nextPath);
      }
      if (error.status === 429) {
        return { kind: "rate-limited", retryAfter: error.retryAfter };
      }
      if (error.status === 503) {
        return { kind: "unavailable" };
      }
    }
    return { kind: "error" };
  }
}

function redirectExpired(nextPath: string): never {
  // Server Components cannot mutate cookies; the expired route clears them
  // and lands on login with the query preserved in the return path.
  redirect(`/api/auth/expired?next=${encodeURIComponent(nextPath)}`);
}

function SearchStateView({ state }: { state: SearchState }) {
  if (state.kind === "initial") {
    return (
      <EmptyBlock
        title="Search for a game"
        description="Look up any game by name to see its details and community activity. Results are limited to the top 10 matches."
      />
    );
  }

  if (state.kind === "invalid") {
    return (
      <div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-6">
        <p className="text-label text-warning">{INVALID_MESSAGES[state.reason]}</p>
      </div>
    );
  }

  if (state.kind === "results") {
    return (
      <section aria-labelledby="search-results-heading" className="flex flex-col gap-3">
        <h2 id="search-results-heading" className="text-title text-fg" aria-live="polite">
          {state.games.length} {state.games.length === 1 ? "result" : "results"}{" "}
          for “{state.query}”
        </h2>
        <ul className="flex flex-col gap-3">
          {state.games.map((game) => (
            <GameCard key={game.igdb_id} game={game} />
          ))}
        </ul>
      </section>
    );
  }

  if (state.kind === "no-results") {
    return (
      <EmptyBlock
        title={`No results for “${state.query}”`}
        description="Check the spelling or try a shorter part of the name."
      />
    );
  }

  if (state.kind === "rate-limited") {
    return (
      <div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-6">
        <p className="text-label text-warning">
          Too many searches.{" "}
          {state.retryAfter
            ? `Try again in ${state.retryAfter} second${state.retryAfter === 1 ? "" : "s"}.`
            : "Please wait a minute and try again."}
        </p>
      </div>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-6">
        <p className="text-label text-danger">
          Game search is temporarily unavailable. Try again in a moment.
        </p>
      </div>
    );
  }

  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-6">
      <p className="text-label text-danger">Something went wrong. Try again.</p>
    </div>
  );
}

function EmptyBlock({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-edge bg-surface/50 px-6 py-12 text-center">
      <p className="text-title text-fg">{title}</p>
      <p className="max-w-sm text-label text-fg-muted">{description}</p>
      <p className="text-meta text-fg-muted">
        Need inspiration? Browse your{" "}
        <Link
          href="/library"
          className="text-brand hover:underline focus-visible:underline"
        >
          library
        </Link>{" "}
        instead.
      </p>
    </div>
  );
}
