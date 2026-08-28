import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addLibraryEntry,
  listLibrary,
  updateLibraryEntry,
} from "@/lib/api/server";
import {
  MAX_REVIEW_BYTES,
  isDateOnly,
  parseLibraryEntry,
  reviewByteLength,
  validateAddLibraryEntry,
  validateUpdateLibraryEntry,
} from "@/lib/library";

const ENTRY = {
  id: "00000000-0000-4000-8000-000000000001",
  status: "playing",
  rating: 4.5,
  review: "Worth remembering.",
  started_at: "2026-08-01",
  completed_at: null,
  game: { igdb_id: 1020, name: "Hollow Knight" },
  created_at: "2026-08-20T12:00:00Z",
  updated_at: "2026-08-21T12:00:00Z",
} as const;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("library contract validation", () => {
  it("parses the verified entry shape and preserves nullable fields", () => {
    expect(parseLibraryEntry(ENTRY)).toEqual(ENTRY);
    expect(
      parseLibraryEntry({ ...ENTRY, rating: null, review: null }),
    ).toMatchObject({ rating: null, review: null });
  });

  it("rejects malformed IDs, statuses, ratings, dates, and games", () => {
    expect(parseLibraryEntry({ ...ENTRY, id: "not-a-uuid" })).toBeNull();
    expect(parseLibraryEntry({ ...ENTRY, status: "wishlist" })).toBeNull();
    expect(parseLibraryEntry({ ...ENTRY, rating: 4.2 })).toBeNull();
    expect(
      parseLibraryEntry({ ...ENTRY, started_at: "2026-02-31" }),
    ).toBeNull();
    expect(parseLibraryEntry({ ...ENTRY, game: { name: "No id" } })).toBeNull();
  });

  it("validates real calendar dates without rollover", () => {
    expect(isDateOnly("2024-02-29")).toBe(true);
    expect(isDateOnly("2025-02-29")).toBe(false);
    expect(isDateOnly("2026-13-01")).toBe(false);
  });

  it("enforces the API's effective UTF-8 byte limit", () => {
    expect(reviewByteLength("ş")).toBe(2);
    expect(reviewByteLength("a".repeat(MAX_REVIEW_BYTES))).toBe(
      MAX_REVIEW_BYTES,
    );
    expect(
      validateUpdateLibraryEntry({ review: "ş".repeat(5_001) }),
    ).toMatchObject({ valid: false });
  });

  it("validates adds and rejects unknown or unsafe fields", () => {
    expect(
      validateAddLibraryEntry({ igdb_id: 1020, status: "backlog" }),
    ).toEqual({
      valid: true,
      value: { igdb_id: 1020, status: "backlog" },
    });
    expect(validateAddLibraryEntry({ igdb_id: 0 })).toMatchObject({
      valid: false,
    });
    expect(
      validateAddLibraryEntry({ igdb_id: 1020, owner_id: "someone-else" }),
    ).toMatchObject({ valid: false });
  });

  it("preserves explicit null clears and checks date order", () => {
    expect(
      validateUpdateLibraryEntry({
        rating: null,
        review: null,
        started_at: null,
        completed_at: null,
      }),
    ).toEqual({
      valid: true,
      value: {
        rating: null,
        review: null,
        started_at: null,
        completed_at: null,
      },
    });
    expect(
      validateUpdateLibraryEntry({
        started_at: "2026-08-10",
        completed_at: "2026-08-09",
      }),
    ).toMatchObject({ valid: false });
    expect(validateUpdateLibraryEntry({})).toMatchObject({ valid: false });
  });
});

describe("server-only library API client", () => {
  beforeEach(() => {
    vi.stubEnv("API_BASE_URL", "https://api.example.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("lists validated entries with the bearer token server-side", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({ library: [ENTRY] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listLibrary("secret-access")).resolves.toEqual([ENTRY]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.example.test/library",
    );
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("Authorization"),
    ).toBe("Bearer secret-access");
  });

  it("rejects malformed upstream library data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ library: [{ ...ENTRY, status: "wishlist" }] }),
      ),
    );
    await expect(listLibrary("access")).rejects.toMatchObject({ status: 502 });
  });

  it("preserves upstream service unavailability as a safe 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ error: "database details that must not leak" }, 503),
      ),
    );
    await expect(listLibrary("access")).rejects.toMatchObject({
      status: 503,
      kind: "unavailable",
      message: "Service temporarily unavailable",
    });
  });

  it("adds and updates only through the expected API paths", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(ENTRY, 201));
    vi.stubGlobal("fetch", fetchMock);

    await addLibraryEntry("access", {
      igdb_id: 1020,
      status: "playing",
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.example.test/library",
    );
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ igdb_id: 1020, status: "playing" }),
    );

    fetchMock.mockResolvedValueOnce(jsonResponse({ ...ENTRY, rating: null }));
    await updateLibraryEntry("access", ENTRY.id, { rating: null });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `https://api.example.test/library/${ENTRY.id}`,
    );
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("PATCH");
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
      JSON.stringify({ rating: null }),
    );
  });
});
