import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ConnectionIcon } from "@/components/icons";
import { SteamConnectCard } from "@/components/steam/steam-connect-card";
import { SteamDisconnectButton } from "@/components/steam/steam-disconnect-button";
import { SteamLibraryCard } from "@/components/steam/steam-library-card";
import { SteamSyncPanel } from "@/components/steam/steam-sync-panel";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError } from "@/lib/api/errors";
import {
  getSteamConnection,
  getSteamLibrary,
  getSteamSyncJob,
  listLibrary,
} from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import type { LibraryEntry } from "@/lib/library";
import {
  isSteamLibraryOffset,
  isSteamSyncJobId,
  STEAM_LIBRARY_PAGE_SIZE,
  type SteamConnection,
  type SteamLibraryPage,
} from "@/lib/steam";

export const metadata: Metadata = { title: "Steam library" };

type PageProps = {
  searchParams: Promise<{
    offset?: string | string[];
    job?: string | string[];
  }>;
};

export default async function SteamConnectionPage({ searchParams }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login?next=%2Fconnections%2Fsteam");
  }

  let connection: SteamConnection;
  try {
    connection = await getSteamConnection(accessToken);
  } catch (error) {
    if (isUnauthorized(error)) {
      redirect("/api/auth/expired?next=%2Fconnections%2Fsteam");
    }
    return <SteamPageFailure />;
  }

  if (!connection.connected) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader />
        <SteamConnectCard />
      </div>
    );
  }

  const query = await searchParams;
  const rawOffset = Array.isArray(query.offset) ? null : (query.offset ?? "0");
  if (rawOffset === null || !isSteamLibraryOffset(rawOffset)) {
    redirect("/connections/steam");
  }
  const offset = Number(rawOffset);

  const rawJobId = Array.isArray(query.job) ? null : query.job;
  const jobId = isSteamSyncJobId(rawJobId) ? rawJobId : null;

  const [steamResult, journalResult, jobResult] = await Promise.allSettled([
    getSteamLibrary(accessToken, STEAM_LIBRARY_PAGE_SIZE, offset),
    listLibrary(accessToken),
    jobId ? getSteamSyncJob(accessToken, jobId) : Promise.resolve(null),
  ]);
  for (const result of [steamResult, journalResult, jobResult]) {
    if (result.status === "rejected" && isUnauthorized(result.reason)) {
      redirect("/api/auth/expired?next=%2Fconnections%2Fsteam");
    }
  }

  const steamPage = steamResult.status === "fulfilled" ? steamResult.value : null;
  const journal = journalResult.status === "fulfilled" ? journalResult.value : null;
  const syncJob = jobResult.status === "fulfilled" ? jobResult.value : null;

  if (steamPage && steamPage.total > 0 && offset >= steamPage.total) {
    const lastOffset = Math.floor((steamPage.total - 1) / STEAM_LIBRARY_PAGE_SIZE) * STEAM_LIBRARY_PAGE_SIZE;
    redirect(`/connections/steam?offset=${lastOffset}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader />

      <ConnectionSummary connection={connection} />
      <SteamSyncPanel initialJob={syncJob} />

      <section aria-labelledby="steam-library-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="steam-library-heading" className="text-title text-fg">Imported Steam library</h2>
              {steamPage && <Badge tone="brand">{steamPage.total} games</Badge>}
            </div>
            <p className="mt-1 text-meta text-fg-muted">
              A read-only ownership snapshot. Add matched games to your journal individually.
            </p>
          </div>
        </div>

        {steamPage === null ? (
          <InlineFailure message="Your imported Steam library could not be loaded." />
        ) : steamPage.games.length === 0 ? (
          <EmptyState
            icon={ConnectionIcon}
            title="No imported Steam games"
            description="Run a sync after connecting. Steam game details must be public for the owned library to be visible."
          />
        ) : (
          <>
            {journal === null && (
              <InlineFailure message="Your Playlog journal could not be loaded, so add/edit controls are unavailable." />
            )}
            <ul className="grid gap-4">
              {steamPage.games.map((item, index) => (
                <SteamLibraryCard
                  key={item.steam_app_id}
                  item={item}
                  journalAvailable={journal !== null}
                  journalEntry={findJournalEntry(journal ?? [], item.game?.igdb_id)}
                  priority={index === 0}
                />
              ))}
            </ul>
            <SteamPagination page={steamPage} />
          </>
        )}
      </section>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-headline text-fg">Steam library</h1>
      <p className="text-label text-fg-muted">Connect a library source without changing how you sign in to Playlog.</p>
    </header>
  );
}

function ConnectionSummary({ connection }: { connection: Extract<SteamConnection, { connected: true }> }) {
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
          <ConnectionIcon />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-title text-fg">Steam connected</h2>
            <Badge tone="success">Connected</Badge>
          </div>
          <dl className="mt-2 grid gap-1 text-meta text-fg-muted">
            <div className="flex gap-1"><dt>Steam ID:</dt><dd className="text-fg">{connection.steam_id}</dd></div>
            <div className="flex gap-1"><dt>Connected:</dt><dd className="text-fg">{formatTimestamp(connection.connected_at)}</dd></div>
            <div className="flex gap-1"><dt>Last sync:</dt><dd className="text-fg">{connection.last_synced_at ? formatTimestamp(connection.last_synced_at) : "Not completed yet"}</dd></div>
          </dl>
        </div>
      </div>
      <SteamDisconnectButton />
    </Card>
  );
}

function SteamPagination({ page }: { page: SteamLibraryPage }) {
  const previousOffset = Math.max(0, page.offset - page.limit);
  const nextOffset = page.offset + page.games.length;
  const hasPrevious = page.offset > 0;
  const hasNext = nextOffset < page.total;
  const start = page.total === 0 ? 0 : page.offset + 1;
  const end = Math.min(page.offset + page.games.length, page.total);

  return (
    <nav aria-label="Steam library pages" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-meta text-fg-muted">Showing {start}–{end} of {page.total}</p>
      <div className="flex gap-2">
        {hasPrevious ? (
          <Link href={`/connections/steam?offset=${previousOffset}`} className={buttonClasses("secondary", "sm")}>Previous</Link>
        ) : (
          <span aria-disabled="true" className={`${buttonClasses("secondary", "sm")} pointer-events-none opacity-50`}>Previous</span>
        )}
        {hasNext ? (
          <Link href={`/connections/steam?offset=${nextOffset}`} className={buttonClasses("secondary", "sm")}>Next</Link>
        ) : (
          <span aria-disabled="true" className={`${buttonClasses("secondary", "sm")} pointer-events-none opacity-50`}>Next</span>
        )}
      </div>
    </nav>
  );
}

function findJournalEntry(entries: LibraryEntry[], igdbId: number | undefined) {
  return igdbId === undefined
    ? null
    : entries.find((entry) => entry.game.igdb_id === igdbId) ?? null;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

function InlineFailure({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-5 text-label text-danger">{message} Try again in a moment.</p>;
}

function SteamPageFailure() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <InlineFailure message="Steam connection status could not be loaded." />
    </div>
  );
}
