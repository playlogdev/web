import { isSafeCoverUrl } from "@/lib/games";
import {
  isLibraryEntryId,
  isLibraryRating,
  isLibraryStatus,
  MAX_REVIEW_BYTES,
  parseLibraryEntry,
  reviewByteLength,
  type LibraryEntry,
  type LibraryStatus,
} from "@/lib/library";

export type PublicProfile = {
  username: string;
  library: LibraryEntry[];
  follower_count: number;
  following_count: number;
  is_following?: boolean;
};

export type ProfileViewer = "anonymous" | "authenticated";
export type ProfileResult = { profile: PublicProfile; viewer: ProfileViewer };

export const FEED_EVENT_TYPES = [
  "logged",
  "status_changed",
  "rated",
  "reviewed",
] as const;

export type FeedEventType = (typeof FEED_EVENT_TYPES)[number];

export type FeedGame = {
  igdb_id: number;
  name: string;
  cover_url?: string;
};

export type FeedEvent = {
  id: string;
  username: string;
  event_type: FeedEventType;
  status: LibraryStatus | null;
  rating: number | null;
  review: string | null;
  created_at: string;
  game: FeedGame;
};

export type FeedPage = {
  events: FeedEvent[];
  next_cursor: string | null;
};

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const FEED_EVENT_SET = new Set<string>(FEED_EVENT_TYPES);

export function isUsername(value: unknown): value is string {
  return typeof value === "string" && USERNAME_PATTERN.test(value);
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function parsePublicProfile(value: unknown): PublicProfile | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    !isUsername(record.username) ||
    !isCount(record.follower_count) ||
    !isCount(record.following_count) ||
    !Array.isArray(record.library) ||
    ("is_following" in record && typeof record.is_following !== "boolean")
  ) {
    return null;
  }

  const library: LibraryEntry[] = [];
  for (const value of record.library) {
    const entry = parseLibraryEntry(value);
    if (entry === null) {
      return null;
    }
    library.push(entry);
  }

  const profile: PublicProfile = {
    username: record.username,
    library,
    follower_count: record.follower_count,
    following_count: record.following_count,
  };
  if (typeof record.is_following === "boolean") {
    profile.is_following = record.is_following;
  }
  return profile;
}

export function parseUsernameList(
  value: unknown,
  key: "followers" | "following",
): string[] | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const list = (value as Record<string, unknown>)[key];
  if (!Array.isArray(list) || !list.every(isUsername)) {
    return null;
  }
  return list;
}

/** Treat the cursor as an opaque, bounded value; never decode it in the web app. */
export function isSafeFeedCursor(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 2048;
}

export function parseFeedPage(value: unknown): FeedPage | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.events)) {
    return null;
  }

  const cursor = record.next_cursor;
  if (cursor !== null && cursor !== undefined && !isSafeFeedCursor(cursor)) {
    return null;
  }

  const events: FeedEvent[] = [];
  for (const value of record.events) {
    const event = parseFeedEvent(value);
    if (event === null) {
      return null;
    }
    events.push(event);
  }

  return { events, next_cursor: cursor ?? null };
}

function parseFeedEvent(value: unknown): FeedEvent | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const game = parseFeedGame(record.game);
  if (
    typeof record.id !== "string" ||
    !isLibraryEntryId(record.id) ||
    !isUsername(record.username) ||
    typeof record.event_type !== "string" ||
    !FEED_EVENT_SET.has(record.event_type) ||
    !isNullableStatus(record.status) ||
    !isNullableRating(record.rating) ||
    !isNullableReview(record.review) ||
    !isTimestamp(record.created_at) ||
    game === null
  ) {
    return null;
  }

  const eventType = record.event_type as FeedEventType;
  if (
    ((eventType === "logged" || eventType === "status_changed") &&
      record.status === null) ||
    (eventType === "rated" && record.rating === null) ||
    (eventType === "reviewed" && record.review === null)
  ) {
    return null;
  }

  return {
    id: record.id,
    username: record.username,
    event_type: eventType,
    status: record.status,
    rating: record.rating,
    review: record.review,
    created_at: record.created_at,
    game,
  };
}

function parseFeedGame(value: unknown): FeedGame | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.igdb_id !== "number" ||
    !Number.isSafeInteger(record.igdb_id) ||
    record.igdb_id <= 0 ||
    typeof record.name !== "string" ||
    record.name.trim().length === 0 ||
    (record.cover_url !== undefined && typeof record.cover_url !== "string")
  ) {
    return null;
  }

  const game: FeedGame = { igdb_id: record.igdb_id, name: record.name };
  if (typeof record.cover_url === "string" && record.cover_url !== "" && isSafeCoverUrl(record.cover_url)) {
    game.cover_url = record.cover_url;
  } else if (record.cover_url !== undefined && record.cover_url !== "") {
    return null;
  }
  return game;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isNullableStatus(value: unknown): value is LibraryStatus | null {
  return value === null || isLibraryStatus(value);
}

function isNullableRating(value: unknown): value is number | null {
  return value === null || isLibraryRating(value);
}

function isNullableReview(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" && reviewByteLength(value) <= MAX_REVIEW_BYTES)
  );
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}
