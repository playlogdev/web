import type { Metadata } from "next";
import { CompassIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-headline text-fg">Discover</h1>
          <Badge tone="brand">Design preview</Badge>
        </div>
        <p className="text-label text-fg-muted">
          Find games to log and see what they&rsquo;re about.
        </p>
      </header>
      <EmptyState
        icon={CompassIcon}
        title="Search is coming soon"
        description="Game search and details arrive in milestone 4. This screen will become your way to find anything worth logging."
        action={
          <Button variant="secondary" disabled>
            Search games
          </Button>
        }
      />
    </div>
  );
}
