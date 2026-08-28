import { parseGame, type Game } from "@/lib/games";

export const LIBRARY_STATUSES = [
  "backlog",
  "playing",
  "completed",
  "dropped",
] as const;

export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

export type LibraryEntry = {
  id: string;
  status: LibraryStatus;
  rating: number | null;
  review: string | null;
  started_at: string | null;
  completed_at: string | null;
  game: Game;
  created_at: string;
  updated_at: string;
};

export type LibraryMutation = {
  status?: LibraryStatus;
  rating?: number | null;
  review?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
};

export type AddLibraryEntry = LibraryMutation & { igdb_id: number };

export const MAX_REVIEW_BYTES = 10_000;

const STATUS_SET = new Set<string>(LIBRARY_STATUSES);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const LIBRARY_STATUS_LABELS: Record<LibraryStatus, string> = {
  backlog: "Backlog",
  playing: "Playing",
  completed: "Completed",
  dropped: "Dropped",
};

export function isLibraryStatus(value: unknown): value is LibraryStatus {
  return typeof value === "string" && STATUS_SET.has(value);
}

export function isLibraryEntryId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
}

export function isLibraryRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0.5 &&
    value <= 5 &&
    Number.isInteger(value * 2)
  );
}

export function reviewByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function parseLibraryEntry(value: unknown): LibraryEntry | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const game = parseGame(record.game);
  if (
    typeof record.id !== "string" ||
    !isLibraryEntryId(record.id) ||
    !isLibraryStatus(record.status) ||
    game === null ||
    !isNullableRating(record.rating) ||
    !isNullableString(record.review) ||
    !isNullableDate(record.started_at) ||
    !isNullableDate(record.completed_at) ||
    !isTimestamp(record.created_at) ||
    !isTimestamp(record.updated_at)
  ) {
    return null;
  }

  if (
    typeof record.review === "string" &&
    reviewByteLength(record.review) > MAX_REVIEW_BYTES
  ) {
    return null;
  }
  if (
    typeof record.started_at === "string" &&
    typeof record.completed_at === "string" &&
    record.completed_at < record.started_at
  ) {
    return null;
  }

  return {
    id: record.id,
    status: record.status,
    rating: record.rating,
    review: record.review,
    started_at: record.started_at,
    completed_at: record.completed_at,
    game,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export type MutationValidation<T> =
  | { valid: true; value: T }
  | { valid: false; message: string };

export function validateAddLibraryEntry(
  body: Record<string, unknown>,
): MutationValidation<AddLibraryEntry> {
  const allowed = new Set([
    "igdb_id",
    "status",
    "rating",
    "review",
    "started_at",
    "completed_at",
  ]);
  const unknown = Object.keys(body).find((key) => !allowed.has(key));
  if (unknown) {
    return { valid: false, message: `Unknown field: ${unknown}` };
  }

  const id = body.igdb_id;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    return { valid: false, message: "A valid game ID is required" };
  }

  const mutation = validateLibraryFields(body, false);
  if (!mutation.valid) {
    return mutation;
  }

  return { valid: true, value: { igdb_id: id, ...mutation.value } };
}

export function validateUpdateLibraryEntry(
  body: Record<string, unknown>,
): MutationValidation<LibraryMutation> {
  const allowed = new Set([
    "status",
    "rating",
    "review",
    "started_at",
    "completed_at",
  ]);
  const keys = Object.keys(body);
  const unknown = keys.find((key) => !allowed.has(key));
  if (unknown) {
    return { valid: false, message: `Unknown field: ${unknown}` };
  }
  if (keys.length === 0) {
    return { valid: false, message: "Choose at least one field to update" };
  }

  return validateLibraryFields(body, true);
}

function validateLibraryFields(
  body: Record<string, unknown>,
  requireOne: boolean,
): MutationValidation<LibraryMutation> {
  const value: LibraryMutation = {};
  let count = 0;

  if ("status" in body) {
    if (!isLibraryStatus(body.status)) {
      return { valid: false, message: "Choose a valid library status" };
    }
    value.status = body.status;
    count += 1;
  }

  if ("rating" in body) {
    if (body.rating !== null && !isLibraryRating(body.rating)) {
      return {
        valid: false,
        message: "Rating must be between 0.5 and 5 in half-point increments",
      };
    }
    value.rating = body.rating as number | null;
    count += 1;
  }

  if ("review" in body) {
    if (body.review !== null && typeof body.review !== "string") {
      return { valid: false, message: "Review must be text or null" };
    }
    if (
      typeof body.review === "string" &&
      reviewByteLength(body.review) > MAX_REVIEW_BYTES
    ) {
      return {
        valid: false,
        message: "Review must be at most 10,000 UTF-8 bytes",
      };
    }
    value.review = body.review as string | null;
    count += 1;
  }

  for (const field of ["started_at", "completed_at"] as const) {
    if (field in body) {
      const date = body[field];
      if (date !== null && !isDateOnly(date)) {
        return { valid: false, message: `${field} must be a valid date` };
      }
      value[field] = date as string | null;
      count += 1;
    }
  }

  if (
    typeof value.started_at === "string" &&
    typeof value.completed_at === "string" &&
    value.completed_at < value.started_at
  ) {
    return {
      valid: false,
      message: "Completed date must be on or after started date",
    };
  }

  if (requireOne && count === 0) {
    return { valid: false, message: "Choose at least one field to update" };
  }

  return { valid: true, value };
}

function isNullableRating(value: unknown): value is number | null {
  return value === null || isLibraryRating(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableDate(value: unknown): value is string | null {
  return value === null || isDateOnly(value);
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}
