import type { Metadata } from "next";
import { ActivityIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-headline text-fg">Activity</h1>
          <Badge tone="brand">Design preview</Badge>
        </div>
        <p className="text-label text-fg-muted">
          What you and your friends have been playing.
        </p>
      </header>
      <EmptyState
        icon={ActivityIcon}
        title="No activity yet"
        description="Log a game or follow friends, and this feed fills up with statuses, ratings, and reviews."
      />
    </div>
  );
}
