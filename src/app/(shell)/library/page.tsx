import type { Metadata } from "next";
import { LibraryIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-headline text-fg">Library</h1>
          <Badge tone="brand">Design preview</Badge>
        </div>
        <p className="text-label text-fg-muted">
          Every game you log, organized by status.
        </p>
      </header>
      <EmptyState
        icon={LibraryIcon}
        title="Your library is empty"
        description="Search for a game and add it to start building your collection. Search arrives in milestone 4."
      />
    </div>
  );
}
