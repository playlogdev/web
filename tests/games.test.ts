import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { getGameDetail, searchGames } from "@/lib/api/server";
import {
  formatReleaseDate,
  isSafeCoverUrl,
  normalizeSearchQuery,
  parseGame,
  releaseYear,
  validateIgdbId,
  validateSearchQuery,
} from "@/lib/games";

const GAME = {
  igdb_id: 1020,
  name: "Hollow Knight",
  slug: "hollow-knight",
  summary: "Descend into Hallownest.",
  cover_url:
    "https://images.igdb.com/igdb/image/upload/t_cover_big/cover.jpg",
  first_release_date: "2017-02-24",
  genres: ["Platformer"],
  developers: ["Team Cherry"],
  publishers: ["Team Cherry"],
};

const STATS = {
  backlog: 1,
  playing: 2,
  completed: 3,
  dropped: 0,
  total_logged: 6,
  rating_count: 2,
  average_rating: 4.5,
};

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function detailResponse(friendsActivity: unknown) {
  return jsonResponse({
    game: GAME,
    stats: STATS,
    friends_activity: friendsActivity,
  });
}

beforeEach(() => {
  process.env.API_BASE_URL = "http://api.test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.API_BASE_URL;
});

describe("game search query validation", () => {
  it("normalizes whitespace like the API", () => {
    expect(normalizeSearchQuery("  hollow\t\n knight  ")).toBe(
      "hollow knight",
    );
  });

  it("uses UTF-8 byte boundaries", () => {
    expect(validateSearchQuery("a")).toEqual({
      valid: false,
      reason: "too-short",
    });
    expect(validateSearchQuery("é")).toEqual({ valid: true, query: "é" });
    expect(validateSearchQuery("é".repeat(50)).valid).toBe(true);
    expect(validateSearchQuery(`${"é".repeat(50)}a`)).toEqual({
      valid: false,
      reason: "too-long",
    });
    expect(validateSearchQuery("a".repeat(100)).valid).toBe(true);
    expect(validateSearchQuery("a".repeat(101))).toEqual({
      valid: false,
      reason: "too-long",
    });
  });

  it("does not call upstream for invalid queries", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchGames("access", "a")).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes and URL-encodes the upstream search", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({ games: [GAME] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchGames("secret-access", "  Zelda & Link ")).resolves.toEqual([
      GAME,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api.test/games/search?q=Zelda+%26+Link");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer secret-access",
    );
  });

  it.each([
    [401, undefined],
    [429, "12"],
    [503, undefined],
  ])("preserves search status %s and Retry-After", async (status, retryAfter) => {
    const headers: Record<string, string> = retryAfter
      ? { "Retry-After": retryAfter }
      : {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "search failed" }, status, headers)),
    );

    try {
      await searchGames("access", "zelda");
      throw new Error("expected search to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status,
        retryAfter: retryAfter ? Number(retryAfter) : undefined,
      });
    }
  });

  it("rejects malformed and oversized result sets", async () => {
    const malformedFetch = vi.fn(async () =>
      jsonResponse({ games: [{ name: "Missing id" }] }),
    );
    vi.stubGlobal("fetch", malformedFetch);
    await expect(searchGames("access", "zelda")).rejects.toMatchObject({
      status: 502,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ games: Array(11).fill(GAME) })),
    );
    await expect(searchGames("access", "zelda")).rejects.toMatchObject({
      status: 502,
    });
  });
});

describe("game identifiers and normalized Game values", () => {
  it("accepts only canonical positive signed-int64 IDs", () => {
    expect(validateIgdbId("1")).toBe(BigInt(1));
    expect(validateIgdbId("9223372036854775807")).toBe(
      BigInt("9223372036854775807"),
    );

    for (const value of [
      "",
      "0",
      "-1",
      "+1",
      "01",
      "1.5",
      "1e3",
      " 1",
      "9223372036854775808",
    ]) {
      expect(validateIgdbId(value)).toBeNull();
    }
  });

  it("keeps optional fields optional and rejects invalid required fields", () => {
    expect(parseGame({ igdb_id: 7, name: "Game" })).toEqual({
      igdb_id: 7,
      name: "Game",
    });
    expect(parseGame({ name: "Missing id" })).toBeNull();
    expect(parseGame({ igdb_id: 7, name: "   " })).toBeNull();
    expect(
      parseGame({ igdb_id: Number.MAX_SAFE_INTEGER + 1, name: "Unsafe" }),
    ).toBeNull();
  });

  it("allows only the verified IGDB image path and host", () => {
    expect(isSafeCoverUrl(GAME.cover_url)).toBe(true);
    expect(
      isSafeCoverUrl(
        "https://images.igdb.com/igdb/image/upload/t_cover_big/cover.jpg?x=1",
      ),
    ).toBe(false);
    expect(
      isSafeCoverUrl("https://images.igdb.net/igdb/image/upload/cover.jpg"),
    ).toBe(false);
    expect(isSafeCoverUrl("https://evil.example/cover.jpg")).toBe(false);
    expect(isSafeCoverUrl("not a URL")).toBe(false);
  });

  it("formats valid date-only values without accepting rollover dates", () => {
    expect(releaseYear("2017-02-24")).toBe(2017);
    expect(formatReleaseDate("2017-02-24")).not.toBeNull();
    expect(releaseYear("2024-02-31")).toBeNull();
    expect(formatReleaseDate("2024-13-01")).toBeNull();
  });
});

describe("optional-auth game details", () => {
  it("requests public details without an Authorization header", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => detailResponse(null));
    vi.stubGlobal("fetch", fetchMock);

    const detail = await getGameDetail(BigInt(1020), undefined);
    expect(detail.friendsActivity).toBeNull();
    expect(
      new Headers(fetchMock.mock.calls[0]![1]?.headers).get("Authorization"),
    ).toBeNull();
  });

  it("preserves the authenticated empty-array state", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => detailResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const detail = await getGameDetail(BigInt(1020), "secret-access");
    expect(detail.friendsActivity).toEqual([]);
    expect(
      new Headers(fetchMock.mock.calls[0]![1]?.headers).get("Authorization"),
    ).toBe("Bearer secret-access");
  });

  it("falls back anonymously exactly once after an authenticated 401", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ error: "invalid or expired token" }, 401),
      )
      .mockResolvedValueOnce(detailResponse(null));
    vi.stubGlobal("fetch", fetchMock);

    const detail = await getGameDetail(BigInt(1020), "stale-access");
    expect(detail.friendsActivity).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      new Headers(fetchMock.mock.calls[0]![1]?.headers).get("Authorization"),
    ).toBe("Bearer stale-access");
    expect(
      new Headers(fetchMock.mock.calls[1]![1]?.headers).get("Authorization"),
    ).toBeNull();
  });

  it("does not retry non-401 authenticated failures", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({ error: "unavailable" }, 503),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getGameDetail(BigInt(1020), "secret-access"),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing friends_activity field and invalid statistics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ game: GAME, stats: STATS })),
    );
    await expect(getGameDetail(BigInt(1020), undefined)).rejects.toMatchObject({
      status: 502,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          game: GAME,
          stats: { ...STATS, average_rating: null },
          friends_activity: null,
        }),
      ),
    );
    await expect(getGameDetail(BigInt(1020), undefined)).rejects.toMatchObject({
      status: 502,
    });
  });

  it("accepts followed-friend activity and keeps null ratings distinct", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        detailResponse([
          { username: "friend", status: "playing", rating: null },
        ]),
      ),
    );

    await expect(
      getGameDetail(BigInt(1020), "access"),
    ).resolves.toMatchObject({
      friendsActivity: [
        { username: "friend", status: "playing", rating: null },
      ],
    });
  });
});
