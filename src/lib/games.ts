/**
 * Pure helpers for game search and game details. Everything here is
 * unit-testable and mirrors the verified Go API behavior exactly:
 * - search queries: whitespace-normalized, then 2-100 UTF-8 bytes
 *   (the Go handler measures with len(), which counts bytes)
 * - game IDs: canonical positive base-10 signed 64-bit integers
 */

export const SEARCH_MIN_BYTES = 2;
export const SEARCH_MAX_BYTES = 100;
export const SEARCH_RESULT_LIMIT = 10; // fixed by the API; no pagination

/** Mirrors normalizeGameSearchQuery: strings.Fields + single-space join. */
export function normalizeSearchQuery(raw: string): string {
  return raw.split(/\s+/).filter(Boolean).join(" ");
}

export type QueryValidation =
  | { valid: true; query: string }
  | { valid: false; reason: "empty" | "too-short" | "too-long" };

export function validateSearchQuery(raw: string | undefined | null): QueryValidation {
  const query = normalizeSearchQuery(raw ?? "");
  const bytes = new TextEncoder().encode(query).length;

  if (bytes === 0) {
    return { valid: false, reason: "empty" };
  }
  if (bytes < SEARCH_MIN_BYTES) {
    return { valid: false, reason: "too-short" };
  }
  if (bytes > SEARCH_MAX_BYTES) {
    return { valid: false, reason: "too-long" };
  }

  return { valid: true, query };
}

/**
 * Accepts only canonical positive base-10 int64 strings: digits only (no
 * sign, whitespace, decimals, exponents, hex, or leading zeros/plus), value
 * in [1, 2^63-1].
 */
export function validateIgdbId(raw: string | undefined | null): bigint | null {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }

  if (!/^[1-9][0-9]*$/.test(raw)) {
    return null;
  }

  const value = BigInt(raw);
  if (value > BigInt("9223372036854775807")) {
    return null;
  }

  return value;
}

/** Game shape from the verified contract; optional fields stay optional. */
export type Game = {
  igdb_id: number;
  name: string;
  slug?: string;
  summary?: string;
  cover_url?: string;
  first_release_date?: string;
  genres?: string[];
  developers?: string[];
  publishers?: string[];
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates an upstream success body into a Game. Returns null for anything
 * malformed so callers can fail safely instead of rendering invented values.
 */
export function parseGame(body: unknown): Game | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const record = body as Record<string, unknown>;
  if (
    typeof record.igdb_id !== "number" ||
    !Number.isSafeInteger(record.igdb_id) ||
    record.igdb_id <= 0
  ) {
    return null;
  }
  if (typeof record.name !== "string" || record.name.trim().length === 0) {
    return null;
  }

  const game: Game = { igdb_id: record.igdb_id, name: record.name };

  if (typeof record.slug === "string") {
    game.slug = record.slug;
  }
  if (typeof record.summary === "string") {
    game.summary = record.summary;
  }
  if (typeof record.cover_url === "string" && isSafeCoverUrl(record.cover_url)) {
    game.cover_url = record.cover_url;
  }
  if (
    typeof record.first_release_date === "string" &&
    isValidDateOnly(record.first_release_date)
  ) {
    game.first_release_date = record.first_release_date;
  }
  for (const key of ["genres", "developers", "publishers"] as const) {
    const value = record[key];
    if (
      Array.isArray(value) &&
      value.every((entry) => typeof entry === "string")
    ) {
      game[key] = value as string[];
    }
  }

  return game;
}

/** Only HTTPS cover images from IGDB's CDN may render through next/image. */
export function isSafeCoverUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "images.igdb.com" &&
      parsed.port === "" &&
      parsed.search === "" &&
      parsed.hash === "" &&
      parsed.pathname.startsWith("/igdb/image/upload/")
    );
  } catch {
    return false;
  }
}

/** Formats a YYYY-MM-DD string without timezone day-shift (UTC-based). */
export function formatReleaseDate(dateOnly: string): string | null {
  if (!isValidDateOnly(dateOnly)) {
    return null;
  }

  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function releaseYear(dateOnly: string): number | null {
  if (!isValidDateOnly(dateOnly)) {
    return null;
  }

  return Number(dateOnly.slice(0, 4));
}

function isValidDateOnly(dateOnly: string): boolean {
  if (!DATE_ONLY_PATTERN.test(dateOnly)) {
    return false;
  }

  const [year, month, day] = dateOnly.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}
