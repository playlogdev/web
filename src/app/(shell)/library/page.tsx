import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LibraryIcon } from "@/components/icons";
import { LibraryCard } from "@/components/library/library-card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listLibrary } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import { getAccessToken } from "@/lib/auth/cookies";
import {
  LIBRARY_STATUSES,
  LIBRARY_STATUS_LABELS,
  isLibraryStatus,
  type LibraryEntry,
  type LibraryStatus,
} from "@/lib/library";

export const metadata: Metadata = { title: "Library" };

type PageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function LibraryPage({ searchParams }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login?next=%2Flibrary");
  }

  let entries: LibraryEntry[];
  try {
    entries = await listLibrary(accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/api/auth/expired?next=%2Flibrary");
    }
    return <LibraryFailure error={error} />;
  }

  const rawStatus = (await searchParams).status;
  const selectedStatus =
    typeof rawStatus === "string" && isLibraryStatus(rawStatus)
      ? rawStatus
      : null;
  const visibleEntries = selectedStatus
    ? entries.filter((entry) => entry.status === selectedStatus)
    : entries;
  const counts = countStatuses(entries);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-headline text-fg">Library</h1>
          <Badge tone="brand">
            {entries.length} {entries.length === 1 ? "game" : "games"}
          </Badge>
        </div>
        <p className="text-label text-fg-muted">
          Your personal game journal, organized by where each story stands.
        </p>
      </header>

      {entries.length > 0 && (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {LIBRARY_STATUSES.map((status) => (
              <div
                key={status}
                className="rounded-xl border border-edge bg-surface px-4 py-3 shadow-card"
              >
                <dt className="text-meta text-fg-muted">
                  {LIBRARY_STATUS_LABELS[status]}
                </dt>
                <dd className="mt-1 text-title text-fg">{counts[status]}</dd>
              </div>
            ))}
          </dl>

          <nav aria-label="Filter library by status">
            <ul className="flex flex-wrap gap-2">
              <FilterLink href="/library" active={selectedStatus === null}>
                All <span aria-hidden>·</span> {entries.length}
              </FilterLink>
              {LIBRARY_STATUSES.map((status) => (
                <FilterLink
                  key={status}
                  href={`/library?status=${status}`}
                  active={selectedStatus === status}
                >
                  {LIBRARY_STATUS_LABELS[status]}{" "}
                  <span aria-hidden>·</span> {counts[status]}
                </FilterLink>
              ))}
            </ul>
          </nav>
        </>
      )}

      {entries.length === 0 ? (
        <EmptyState
          icon={LibraryIcon}
          title="Your library is empty"
          description="Find a game, add it to your journal, and choose where you are in the journey."
          action={
            <Link href="/discover" className={buttonClasses("primary", "sm")}>
              Discover games
            </Link>
          }
        />
      ) : visibleEntries.length === 0 ? (
        <EmptyState
          icon={LibraryIcon}
          title={`No ${selectedStatus ? LIBRARY_STATUS_LABELS[selectedStatus].toLowerCase() : ""} games`}
          description="Try another status or view your complete journal."
          action={
            <Link href="/library" className={buttonClasses("secondary", "sm")}>
              View all games
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4">
          {visibleEntries.map((entry, index) => (
            <LibraryCard key={entry.id} entry={entry} priority={index === 0} />
          ))}
        </ul>
      )}

      <p className="text-meta text-fg-muted">
        Removing games is not available yet because the current Playlog API
        does not support it. Your saved journal details remain editable.
      </p>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={[
          "inline-flex h-9 items-center rounded-full border px-3 text-label whitespace-nowrap transition-colors",
          active
            ? "border-brand/50 bg-brand/10 text-brand"
            : "border-edge bg-surface text-fg-muted hover:border-edge-strong hover:text-fg",
        ].join(" ")}
      >
        {children}
      </Link>
    </li>
  );
}

function countStatuses(entries: LibraryEntry[]) {
  const counts: Record<LibraryStatus, number> = {
    backlog: 0,
    playing: 0,
    completed: 0,
    dropped: 0,
  };
  for (const entry of entries) {
    counts[entry.status] += 1;
  }
  return counts;
}

function LibraryFailure({ error }: { error: unknown }) {
  const unavailable = error instanceof ApiError && error.status === 503;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-headline text-fg">Library</h1>
        <p className="text-label text-fg-muted">Your personal game journal.</p>
      </header>
      <div
        role="alert"
        className="rounded-xl border border-danger/40 bg-danger/10 px-5 py-6"
      >
        <h2 className="text-title text-danger">
          {unavailable
            ? "Your library is temporarily unavailable"
            : "Couldn't load your library"}
        </h2>
        <p className="mt-2 text-label text-fg-muted">
          Your journal data is safe. Try this page again in a moment.
        </p>
      </div>
    </div>
  );
}
