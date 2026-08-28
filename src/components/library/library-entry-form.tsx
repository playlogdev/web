"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LIBRARY_STATUSES,
  LIBRARY_STATUS_LABELS,
  MAX_REVIEW_BYTES,
  reviewByteLength,
  type LibraryEntry,
  type LibraryMutation,
  type LibraryStatus,
} from "@/lib/library";

type Props = {
  gameId: number;
  gameName: string;
  initialEntry: LibraryEntry | null;
};

const fieldClasses =
  "h-10 w-full rounded-lg border border-edge bg-background px-3 text-base text-fg transition-colors duration-150 hover:border-edge-strong disabled:pointer-events-none disabled:opacity-50";

export function LibraryEntryForm({
  gameId,
  gameName,
  initialEntry,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [entry, setEntry] = useState(initialEntry);
  const [editing, setEditing] = useState(initialEntry === null);
  const [status, setStatus] = useState<LibraryStatus>(
    initialEntry?.status ?? "backlog",
  );
  const [rating, setRating] = useState(
    initialEntry?.rating?.toString() ?? "",
  );
  const [review, setReview] = useState(initialEntry?.review ?? "");
  const [startedAt, setStartedAt] = useState(
    initialEntry?.started_at ?? "",
  );
  const [completedAt, setCompletedAt] = useState(
    initialEntry?.completed_at ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetFrom(next: LibraryEntry) {
    setStatus(next.status);
    setRating(next.rating?.toString() ?? "");
    setReview(next.review ?? "");
    setStartedAt(next.started_at ?? "");
    setCompletedAt(next.completed_at ?? "");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }

    setError(null);
    setSuccess(null);

    if (reviewByteLength(review) > MAX_REVIEW_BYTES) {
      setError("Review must be at most 10,000 UTF-8 bytes.");
      return;
    }
    if (startedAt && completedAt && completedAt < startedAt) {
      setError("Completed date must be on or after started date.");
      return;
    }

    const normalizedRating = rating === "" ? null : Number(rating);
    const normalizedReview = review.trim().length === 0 ? null : review;
    const normalizedStartedAt = startedAt || null;
    const normalizedCompletedAt = completedAt || null;

    const body = entry
      ? changedFields(entry, {
          status,
          rating: normalizedRating,
          review: normalizedReview,
          started_at: normalizedStartedAt,
          completed_at: normalizedCompletedAt,
        })
      : { igdb_id: gameId, status };

    if (entry && Object.keys(body).length === 0) {
      setError("Make a change before saving.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        entry ? `/api/library/${encodeURIComponent(entry.id)}` : "/api/library",
        {
          method: entry ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
        },
      );

      if (response.status === 401) {
        router.push(
          `/api/auth/expired?next=${encodeURIComponent(pathname)}`,
        );
        return;
      }

      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        if (response.status === 409) {
          setError("This game is already in your library. Refreshing your journal…");
          router.refresh();
          return;
        }
        if (response.status === 429) {
          const seconds = Number(response.headers.get("Retry-After"));
          setError(
            Number.isFinite(seconds) && seconds > 0
              ? `Too many updates. Try again in ${Math.ceil(seconds)} seconds.`
              : "Too many updates. Wait a minute and try again.",
          );
          return;
        }
        setError(responseBody?.error ?? "Could not save this journal entry.");
        return;
      }

      const next = (await response.json()) as LibraryEntry;
      setEntry(next);
      resetFrom(next);
      setEditing(false);
      setSuccess(
        entry
          ? "Journal entry updated."
          : `${gameName} was added to your library.`,
      );
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (entry && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setError(null);
            setSuccess(null);
            setEditing(true);
          }}
        >
          Edit journal entry
        </Button>
        {success && (
          <p role="status" aria-live="polite" className="text-label text-success">
            {success}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-label text-fg-muted">
          Status
          <select
            className={fieldClasses}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as LibraryStatus)
            }
            disabled={loading}
          >
            {LIBRARY_STATUSES.map((value) => (
              <option key={value} value={value}>
                {LIBRARY_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        {entry && (
          <label className="flex flex-col gap-1.5 text-label text-fg-muted">
            Rating
            <select
              className={fieldClasses}
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              disabled={loading}
            >
              <option value="">No rating</option>
              {Array.from({ length: 10 }, (_, index) => (index + 1) / 2).map(
                (value) => (
                  <option key={value} value={value}>
                    {value.toFixed(1)} / 5
                  </option>
                ),
              )}
            </select>
          </label>
        )}
      </div>

      {entry && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-label text-fg-muted">
              Started
              <input
                type="date"
                className={fieldClasses}
                value={startedAt}
                onChange={(event) => setStartedAt(event.target.value)}
                disabled={loading}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-label text-fg-muted">
              Completed
              <input
                type="date"
                className={fieldClasses}
                value={completedAt}
                min={startedAt || undefined}
                onChange={(event) => setCompletedAt(event.target.value)}
                disabled={loading}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-label text-fg-muted">
            Review
            <textarea
              className="min-h-32 w-full resize-y rounded-lg border border-edge bg-background px-3 py-2 text-base text-fg transition-colors duration-150 placeholder:text-fg-muted/70 hover:border-edge-strong disabled:pointer-events-none disabled:opacity-50"
              value={review}
              onChange={(event) => setReview(event.target.value)}
              placeholder="What do you want to remember about this game?"
              disabled={loading}
              aria-describedby="review-size"
            />
            <span
              id="review-size"
              className={
                reviewByteLength(review) > MAX_REVIEW_BYTES
                  ? "text-meta text-danger"
                  : "text-meta text-fg-muted"
              }
            >
              {reviewByteLength(review).toLocaleString()} / 10,000 UTF-8 bytes
            </span>
          </label>
        </>
      )}

      {error && (
        <p role="alert" aria-live="polite" className="text-label text-danger">
          {error}
        </p>
      )}
      {success && (
        <p role="status" aria-live="polite" className="text-label text-success">
          {success}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={loading}>
          {loading
            ? "Saving…"
            : entry
              ? "Save changes"
              : "Add to library"}
        </Button>
        {entry && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => {
              resetFrom(entry);
              setError(null);
              setSuccess(null);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function changedFields(
  entry: LibraryEntry,
  next: Required<LibraryMutation>,
): LibraryMutation {
  const changes: LibraryMutation = {};
  for (const key of [
    "status",
    "rating",
    "review",
    "started_at",
    "completed_at",
  ] as const) {
    if (entry[key] !== next[key]) {
      Object.assign(changes, { [key]: next[key] });
    }
  }
  return changes;
}
