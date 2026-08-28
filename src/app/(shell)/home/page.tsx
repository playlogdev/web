import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedEventCard } from "@/components/social/feed-event-card";
import { ProfileLookupForm } from "@/components/social/profile-lookup-form";
import { PublicLibraryCard } from "@/components/social/public-library-card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityIcon, LibraryIcon } from "@/components/icons";
import { ApiError } from "@/lib/api/errors";
import { getFeed, listLibrary } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login?next=%2Fhome");
  }

  const [libraryResult, feedResult] = await Promise.allSettled([
    listLibrary(accessToken),
    getFeed(accessToken, undefined, 4),
  ]);
  for (const result of [libraryResult, feedResult]) {
    if (result.status === "rejected" && result.reason instanceof ApiError && result.reason.status === 401) {
      redirect("/api/auth/expired?next=%2Fhome");
    }
  }

  const library = libraryResult.status === "fulfilled" ? libraryResult.value : null;
  const feed = feedResult.status === "fulfilled" ? feedResult.value : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-headline text-fg">Your game journal</h1>
        <p className="text-label text-fg-muted">Track. Rate. Remember — and see what the people you follow are playing.</p>
      </header>

      <section aria-labelledby="recent-journal-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 id="recent-journal-heading" className="text-title text-fg">Recently logged</h2>
            {library && <Badge tone="brand">{library.length} games</Badge>}
          </div>
          <Link href="/library" className={buttonClasses("ghost", "sm")}>View library</Link>
        </div>
        {library === null ? (
          <InlineFailure message="Your library could not be loaded." />
        ) : library.length === 0 ? (
          <EmptyState
            icon={LibraryIcon}
            title="Your journal is empty"
            description="Discover a game and add the first entry to your personal library."
            action={<Link href="/discover" className={buttonClasses("primary", "sm")}>Discover games</Link>}
          />
        ) : (
          <ul className="grid gap-4">
            {library.slice(0, 3).map((entry, index) => (
              <PublicLibraryCard key={entry.id} entry={entry} priority={index === 0} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="feed-preview-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="feed-preview-heading" className="text-title text-fg">From people you follow</h2>
          <Link href="/activity" className={buttonClasses("ghost", "sm")}>View activity</Link>
        </div>
        {feed === null ? (
          <InlineFailure message="Your activity feed could not be loaded." />
        ) : feed.events.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            title="Your feed is quiet"
            description="Find a player by exact username and follow their journal updates."
          />
        ) : (
          <ul className="grid gap-4">
            {feed.events.slice(0, 3).map((event) => <FeedEventCard key={event.id} event={event} />)}
          </ul>
        )}
      </section>

      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="text-title text-fg">Find a player</h2>
          <p className="text-meta text-fg-muted">Use their exact Playlog username.</p>
        </div>
        <ProfileLookupForm compact />
      </Card>
    </div>
  );
}

function InlineFailure({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-5 text-label text-danger">{message} Try again in a moment.</p>;
}
