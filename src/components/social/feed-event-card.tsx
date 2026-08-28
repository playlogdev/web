import Link from "next/link";
import { GameCover } from "@/components/games/game-cover";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  LIBRARY_STATUS_LABELS,
  type LibraryStatus,
} from "@/lib/library";
import type { FeedEvent, FeedEventType } from "@/lib/social";

const EVENT_TONES: Record<FeedEventType, BadgeTone> = {
  logged: "brand",
  status_changed: "info",
  rated: "warning",
  reviewed: "neutral",
};

const EVENT_LABELS: Record<FeedEventType, string> = {
  logged: "Logged",
  status_changed: "Status update",
  rated: "Rated",
  reviewed: "Reviewed",
};

export function FeedEventCard({ event }: { event: FeedEvent }) {
  return (
    <li>
      <article className="flex gap-4 rounded-xl border border-edge bg-surface p-4 shadow-card">
        <Link
          href={`/games/${event.game.igdb_id}`}
          aria-label={`View ${event.game.name}`}
          className="h-31.25 w-22 shrink-0 rounded-lg"
        >
          <GameCover game={event.game} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/users/${encodeURIComponent(event.username)}`}
              className="font-semibold text-fg hover:text-brand"
            >
              @{event.username}
            </Link>
            <Badge tone={EVENT_TONES[event.event_type]}>
              {EVENT_LABELS[event.event_type]}
            </Badge>
          </div>
          <Link
            href={`/games/${event.game.igdb_id}`}
            className="text-title text-fg hover:text-brand"
          >
            {event.game.name}
          </Link>
          <EventDetail event={event} />
          <time dateTime={event.created_at} className="text-meta text-fg-muted">
            {formatTimestamp(event.created_at)}
          </time>
        </div>
      </article>
    </li>
  );
}

function EventDetail({ event }: { event: FeedEvent }) {
  if (event.event_type === "rated" && event.rating !== null) {
    return <p className="text-label text-warning">★ {event.rating.toFixed(1)} / 5</p>;
  }
  if (event.event_type === "reviewed" && event.review !== null) {
    return (
      <blockquote className="border-l-2 border-brand/60 pl-3 text-label text-fg-muted">
        <p className="line-clamp-4 whitespace-pre-line">{event.review}</p>
      </blockquote>
    );
  }
  if (event.status !== null) {
    return (
      <p className="text-label text-fg-muted">
        {event.event_type === "logged" ? "Added as" : "Now"}{" "}
        <span className="text-fg">
          {LIBRARY_STATUS_LABELS[event.status as LibraryStatus]}
        </span>
      </p>
    );
  }
  return null;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
