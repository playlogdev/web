import Link from "next/link";
import { UserIcon } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";

export function ConnectionList({
  usernames,
  emptyTitle,
  emptyDescription,
}: {
  usernames: string[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (usernames.length === 0) {
    return <EmptyState icon={UserIcon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {usernames.map((username) => (
        <li key={username}>
          <Link
            href={`/users/${encodeURIComponent(username)}`}
            className="flex items-center gap-3 rounded-xl border border-edge bg-surface px-4 py-3 text-label text-fg shadow-card transition-colors hover:border-edge-strong hover:text-brand"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-elevated text-fg-muted">
              <UserIcon />
            </span>
            <span className="font-semibold">@{username}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
