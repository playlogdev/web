import Link from "next/link";
import type { FriendActivity } from "@/lib/api/server";

const STATUS_TEXT: Record<FriendActivity["status"], string> = {
  backlog: "in the backlog",
  playing: "playing",
  completed: "completed",
  dropped: "dropped",
};

function Rating({ rating }: { rating: number | null }) {
  // A null rating means "not rated", never zero.
  if (rating === null) {
    return <span className="text-meta text-fg-muted">not rated</span>;
  }

  return (
    <span className="text-meta text-brand" aria-label={`Rated ${rating} out of 5`}>
      ★ {rating.toFixed(1)}
    </span>
  );
}

/**
 * Three semantically distinct states from the API contract:
 * null (unauthenticated viewer), [] (signed in, nobody followed logged it),
 * populated (followed friends' activity).
 */
export function FriendsActivity({
  activity,
  gamePath,
}: {
  activity: FriendActivity[] | null;
  gamePath: string;
}) {
  return (
    <section aria-labelledby="friends-activity-heading" className="flex flex-col gap-3">
      <h2 id="friends-activity-heading" className="text-title text-fg">
        Friends activity
      </h2>

      {activity === null && (
        <p className="rounded-xl border border-dashed border-edge bg-surface/50 px-4 py-6 text-label text-fg-muted">
          <Link
            href={`/login?next=${encodeURIComponent(gamePath)}`}
            className="font-medium text-brand hover:underline focus-visible:underline"
          >
            Log in
          </Link>{" "}
          to see which of your followed friends have logged this game.
        </p>
      )}

      {activity !== null && activity.length === 0 && (
        <p className="rounded-xl border border-dashed border-edge bg-surface/50 px-4 py-6 text-label text-fg-muted">
          None of your followed friends has logged this game yet.
        </p>
      )}

      {activity !== null && activity.length > 0 && (
        <ul className="flex flex-col divide-y divide-edge rounded-xl border border-edge bg-surface">
          {activity.map((entry) => (
            <li key={entry.username} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-label text-fg">
                <span className="font-semibold">{entry.username}</span>{" "}
                <span className="text-fg-muted">is {STATUS_TEXT[entry.status]}</span>
              </span>
              <Rating rating={entry.rating} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
