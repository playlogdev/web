import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSteamConnection,
  getSteamLibrary,
  getSteamSyncJob,
  startSteamConnection,
} from "@/lib/api/server";
import {
  isSteamLibraryOffset,
  isSteamSyncJobId,
  parseSteamAuthorizationURL,
  parseSteamConnection,
  parseSteamLibraryPage,
  parseSteamSyncJob,
} from "@/lib/steam";

const JOB_ID = "00000000-0000-4000-8000-000000000001";
const TIMESTAMP = "2026-08-28T12:00:00Z";

const COMPLETED_JOB = {
  id: JOB_ID,
  status: "completed",
  total_count: 2,
  matched_count: 1,
  unmatched_count: 1,
  error: null,
  started_at: TIMESTAMP,
  completed_at: "2026-08-28T12:01:00Z",
  created_at: TIMESTAMP,
} as const;

const LIBRARY_PAGE = {
  games: [
    {
      steam_app_id: "10",
      steam_name: "Alpha Game",
      playtime_minutes: 125,
      matched: true,
      game: { igdb_id: 100, name: "Alpha Game" },
      last_seen_at: TIMESTAMP,
    },
    {
      steam_app_id: "20",
      steam_name: "Unmatched Game",
      playtime_minutes: 0,
      matched: false,
      game: null,
      last_seen_at: TIMESTAMP,
    },
  ],
  total: 2,
  limit: 24,
  offset: 0,
} as const;

function authorizationURL(apiBase = "https://api.playlog.test") {
  const returnTo = `${apiBase}/connections/steam/callback?state=opaque-state`;
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": new URL(apiBase).origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `https://steamcommunity.com/openid/login?${params.toString()}`;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Steam contract validation", () => {
  it("keeps disconnected and connected states distinct", () => {
    expect(parseSteamConnection({ connected: false, game_count: 0 })).toEqual({
      connected: false,
      game_count: 0,
    });
    expect(parseSteamConnection({
      connected: true,
      steam_id: "76561198000000000",
      connected_at: TIMESTAMP,
      last_synced_at: TIMESTAMP,
      game_count: 2,
    })).toMatchObject({ connected: true, game_count: 2 });
    expect(parseSteamConnection({ connected: false, game_count: 1 })).toBeNull();
    expect(parseSteamConnection({ connected: true, steam_id: "not-steam", connected_at: TIMESTAMP, game_count: 0 })).toBeNull();
  });

  it("validates sync status invariants and UUIDs", () => {
    expect(parseSteamSyncJob(COMPLETED_JOB)).toEqual(COMPLETED_JOB);
    expect(parseSteamSyncJob({ ...COMPLETED_JOB, matched_count: 2 })).toBeNull();
    expect(parseSteamSyncJob({ ...COMPLETED_JOB, status: "failed", error: null })).toBeNull();
    expect(isSteamSyncJobId(JOB_ID)).toBe(true);
    expect(isSteamSyncJobId("not-a-job")).toBe(false);
  });

  it("validates matched and unmatched ownerships", () => {
    expect(parseSteamLibraryPage(LIBRARY_PAGE)).toEqual(LIBRARY_PAGE);
    expect(parseSteamLibraryPage({
      ...LIBRARY_PAGE,
      games: [{ ...LIBRARY_PAGE.games[1], matched: true }],
    })).toBeNull();
    expect(parseSteamLibraryPage({ ...LIBRARY_PAGE, limit: 201 })).toBeNull();
  });

  it("accepts canonical safe offsets only", () => {
    expect(isSteamLibraryOffset("0")).toBe(true);
    expect(isSteamLibraryOffset("24")).toBe(true);
    expect(isSteamLibraryOffset("024")).toBe(false);
    expect(isSteamLibraryOffset("-1")).toBe(false);
  });

  it("allows only Steam OpenID URLs returning to the configured API", () => {
    const safe = authorizationURL();
    expect(parseSteamAuthorizationURL(safe, "https://api.playlog.test")).toBe(safe);
    expect(parseSteamAuthorizationURL(
      safe.replace("steamcommunity.com", "steamcommunity.com.evil.example"),
      "https://api.playlog.test",
    )).toBeNull();
    expect(parseSteamAuthorizationURL(
      authorizationURL("https://evil.example"),
      "https://api.playlog.test",
    )).toBeNull();
  });
});

describe("server-only Steam API client", () => {
  beforeEach(() => vi.stubEnv("API_BASE_URL", "https://api.playlog.test"));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("validates the authorization URL before returning it", async () => {
    const safe = authorizationURL();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ authorization_url: safe })));
    await expect(startSteamConnection("secret")).resolves.toBe(safe);
  });

  it("parses connection and job responses", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ connected: false, game_count: 0 }))
      .mockResolvedValueOnce(jsonResponse(COMPLETED_JOB));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getSteamConnection("secret")).resolves.toMatchObject({ connected: false });
    await expect(getSteamSyncJob("secret", JOB_ID)).resolves.toEqual(COMPLETED_JOB);
  });

  it("uses bounded, encoded library pagination and verifies the echo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(LIBRARY_PAGE));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getSteamLibrary("secret", 24, 0)).resolves.toEqual(LIBRARY_PAGE);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://api.playlog.test/connections/steam/library?limit=24&offset=0",
    );
  });
});
