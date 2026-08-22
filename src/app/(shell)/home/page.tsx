import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Home" };

/**
 * Shell preview for milestone 2. The skeleton row and empty states are
 * temporary design fixtures demonstrating loading/empty presentation — they
 * are removed when real data arrives (milestones 3–5).
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-headline text-fg">Welcome to your journal</h1>
          <Badge tone="brand">Design preview</Badge>
        </div>
        <p className="text-label text-fg-muted">
          Track. Rate. Remember. This is the shell your journal will live in.
        </p>
      </header>

      <section aria-labelledby="recently-logged-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="recently-logged-heading" className="text-title text-fg">
            Recently logged
          </h2>
        </div>
        <Card aria-hidden className="flex items-center gap-4">
          <Skeleton shape="circle" />
          <div className="flex w-full max-w-xs flex-1 flex-col gap-2">
            <Skeleton className="w-3/5" />
            <Skeleton className="w-2/5" />
          </div>
          <Skeleton className="hidden w-16 sm:block" />
        </Card>
        <p className="text-meta text-fg-muted">
          Skeletons illustrate how entries appear while data loads (milestone
          3+). No real data yet.
        </p>
      </section>

      <section aria-labelledby="your-library-heading" className="flex flex-col gap-3">
        <h2 id="your-library-heading" className="text-title text-fg">
          Your library
        </h2>
        <EmptyState
          title="Nothing logged yet"
          description="Once you add games, they'll show up here with status, ratings, and reviews."
        />
      </section>

      <section aria-labelledby="friends-heading" className="flex flex-col gap-3">
        <h2 id="friends-heading" className="text-title text-fg">
          Friends
        </h2>
        <EmptyState
          title="No follows yet"
          description="Follow friends to see what everyone is playing in your activity feed."
        />
      </section>
    </div>
  );
}
