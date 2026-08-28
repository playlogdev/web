"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FeedEventCard } from "@/components/social/feed-event-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityIcon } from "@/components/icons";
import { parseFeedPage, type FeedPage } from "@/lib/social";

export function ActivityFeed({ initialPage }: { initialPage: FeedPage }) {
  const pathname = usePathname();
  const router = useRouter();
  const [events, setEvents] = useState(initialPage.events);
  const [cursor, setCursor] = useState(initialPage.next_cursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor || loading) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ cursor });
      const response = await fetch(`/api/feed?${params.toString()}`, {
        credentials: "same-origin",
      });
      if (response.status === 401) {
        router.push(`/api/auth/expired?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!response.ok) {
        setError("More activity could not be loaded. Try again.");
        return;
      }
      const page = parseFeedPage(await response.json());
      if (page === null) {
        setError("The activity response was not valid. Try again.");
        return;
      }
      setEvents((current) => {
        const seen = new Set(current.map((event) => event.id));
        return [...current, ...page.events.filter((event) => !seen.has(event.id))];
      });
      setCursor(page.next_cursor);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="Your feed is quiet"
        description="Follow another player to see their game logs, ratings, reviews, and status changes here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-4">
        {events.map((event) => <FeedEventCard key={event.id} event={event} />)}
      </ul>
      {error && <p role="alert" className="text-center text-label text-danger">{error}</p>}
      {cursor && (
        <Button variant="secondary" loading={loading} onClick={loadMore} className="self-center">
          {loading ? "Loading…" : "Load more activity"}
        </Button>
      )}
      {!cursor && (
        <p className="text-center text-meta text-fg-muted">You are all caught up.</p>
      )}
    </div>
  );
}
