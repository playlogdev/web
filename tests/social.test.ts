import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFeed, getPublicProfile } from "@/lib/api/server";
import {
  isSafeFeedCursor,
  isUsername,
  normalizeUsername,
  parseFeedPage,
  parsePublicProfile,
} from "@/lib/social";

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

const EVENT = {
  id: "00000000-0000-4000-8000-000000000002",
  username: "player_one",
  event_type: "rated",
  status: null,
  rating: 4.5,
  review: null,
  created_at: "2026-08-21T12:00:00Z",
  game: {
    igdb_id: 1020,
    name: "Hollow Knight",
    cover_url: "https://images.igdb.com/igdb/image/upload/t_cover_big/cover.jpg",
  },
} as const;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("social contract validation", () => {
  it("normalizes and validates the API username format", () => {
    expect(normalizeUsername("  Player_One ")).toBe("player_one");
    expect(isUsername("player_one")).toBe(true);
    expect(isUsername("Player One")).toBe(false);
    expect(isUsername("ab")).toBe(false);
  });

  it("parses public profiles and keeps optional follow state distinct", () => {
    expect(parsePublicProfile({
      username: "player_one",
      library: [ENTRY],
      follower_count: 3,
      following_count: 2,
      is_following: true,
    })).toMatchObject({ username: "player_one", is_following: true });

    const anonymous = parsePublicProfile({
      username: "player_one",
      library: [],
      follower_count: 0,
      following_count: 0,
    });
    expect(anonymous).not.toHaveProperty("is_following");
    expect(parsePublicProfile({ ...anonymous, is_following: null })).toBeNull();
  });

  it("validates feed event invariants, cover hosts, and bounded cursors", () => {
    expect(parseFeedPage({ events: [EVENT], next_cursor: "opaque" })).toEqual({
      events: [EVENT],
      next_cursor: "opaque",
    });
    expect(parseFeedPage({ events: [{ ...EVENT, rating: null }], next_cursor: null })).toBeNull();
    expect(parseFeedPage({
      events: [{ ...EVENT, game: { ...EVENT.game, cover_url: "https://evil.example/cover.jpg" } }],
      next_cursor: null,
    })).toBeNull();
    expect(isSafeFeedCursor("x")).toBe(true);
    expect(isSafeFeedCursor("x".repeat(2049))).toBe(false);
  });
});

describe("server-only social API client", () => {
  beforeEach(() => vi.stubEnv("API_BASE_URL", "https://api.example.test"));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("retries a public profile anonymously exactly once after stale auth", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse({
        username: "player_one",
        library: [],
        follower_count: 0,
        following_count: 0,
      }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPublicProfile("player_one", "stale-token")).resolves.toMatchObject({
      viewer: "anonymous",
      profile: { username: "player_one" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer stale-token",
    });
    expect((fetchMock.mock.calls[1]![1] as RequestInit).headers).not.toHaveProperty("Authorization");
  });

  it("passes opaque feed cursors through URLSearchParams and validates output", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ events: [EVENT], next_cursor: null }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getFeed("secret", "opaque+cursor", 12)).resolves.toMatchObject({ events: [EVENT] });
    expect(fetchMock.mock.calls[0]![0]).toBe("https://api.example.test/feed?limit=12&cursor=opaque%2Bcursor");
  });
});
