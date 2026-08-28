import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { SteamConnection, SteamLibraryPage, SteamSyncJob } from "@/lib/steam";

vi.mock("next/server", () => {
  class MockNextResponse extends Response {
    static json(body: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { "Content-Type": "application/json", ...Object.fromEntries(new Headers(init?.headers)) },
      });
    }
  }
  return { NextResponse: MockNextResponse };
});

const store = { get: vi.fn<(name: string) => { value: string } | undefined>() };
vi.mock("next/headers", () => ({ cookies: async () => store }));
vi.mock("@/lib/api/server", () => ({
  disconnectSteam: vi.fn(),
  getSteamConnection: vi.fn(),
  getSteamLibrary: vi.fn(),
  getSteamSyncJob: vi.fn(),
  queueSteamSync: vi.fn(),
  startSteamConnection: vi.fn(),
}));

import { DELETE as disconnect, GET as connectionStatus } from "@/app/api/connections/steam/route";
import { GET as steamLibrary } from "@/app/api/connections/steam/library/route";
import { POST as startConnection } from "@/app/api/connections/steam/start/route";
import { POST as startSync } from "@/app/api/connections/steam/sync/route";
import { GET as syncStatus } from "@/app/api/connections/steam/sync/[id]/route";
import {
  disconnectSteam,
  getSteamConnection,
  getSteamLibrary,
  getSteamSyncJob,
  queueSteamSync,
  startSteamConnection,
} from "@/lib/api/server";

const HOST = "localhost:3000";
const JOB_ID = "00000000-0000-4000-8000-000000000001";
const CONNECTION: SteamConnection = { connected: false, game_count: 0 };
const JOB: SteamSyncJob = {
  id: JOB_ID,
  status: "queued",
  total_count: 0,
  matched_count: 0,
  unmatched_count: 0,
  error: null,
  started_at: null,
  completed_at: null,
  created_at: "2026-08-28T12:00:00Z",
};
const PAGE: SteamLibraryPage = { games: [], total: 0, limit: 24, offset: 0 };

function mutationRequest(path: string, method: "POST" | "DELETE", origin = `http://${HOST}`) {
  return new Request(`http://${HOST}${path}`, {
    method,
    headers: {
      Host: HOST,
      Origin: origin,
      "Sec-Fetch-Site": origin === `http://${HOST}` ? "same-origin" : "cross-site",
    },
  });
}

describe("Steam BFF routes", () => {
  beforeEach(() => {
    for (const mock of [disconnectSteam, getSteamConnection, getSteamLibrary, getSteamSyncJob, queueSteamSync, startSteamConnection]) {
      vi.mocked(mock).mockReset();
    }
    store.get.mockReset();
    store.get.mockImplementation((name) => name === "playlog_at" ? { value: "secret-access" } : undefined);
  });

  it("requires a session for connection status", async () => {
    store.get.mockReturnValue(undefined);
    expect((await connectionStatus()).status).toBe(401);
    expect(getSteamConnection).not.toHaveBeenCalled();
  });

  it("returns validated connection state without token material", async () => {
    vi.mocked(getSteamConnection).mockResolvedValue(CONNECTION);
    const response = await connectionStatus();
    expect(response.status).toBe(200);
    expect(getSteamConnection).toHaveBeenCalledWith("secret-access");
    expect(await response.text()).not.toContain("secret-access");
  });

  it("rejects cross-site start and disconnect mutations", async () => {
    const evil = "https://evil.example";
    expect((await startConnection(mutationRequest("/api/connections/steam/start", "POST", evil))).status).toBe(403);
    expect((await disconnect(mutationRequest("/api/connections/steam", "DELETE", evil))).status).toBe(403);
    expect(startSteamConnection).not.toHaveBeenCalled();
    expect(disconnectSteam).not.toHaveBeenCalled();
  });

  it("starts connection, disconnects, and preserves rate limits", async () => {
    vi.mocked(startSteamConnection).mockResolvedValue("https://steamcommunity.com/openid/login?safe=1");
    const started = await startConnection(mutationRequest("/api/connections/steam/start", "POST"));
    expect(started.status).toBe(200);
    expect(await started.text()).not.toContain("secret-access");

    expect((await disconnect(mutationRequest("/api/connections/steam", "DELETE"))).status).toBe(204);

    vi.mocked(startSteamConnection).mockRejectedValueOnce(new ApiError(429, "too many requests", "expected", 8));
    const limited = await startConnection(mutationRequest("/api/connections/steam/start", "POST"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("8");
  });

  it("queues and reads sync jobs through explicit routes", async () => {
    vi.mocked(queueSteamSync).mockResolvedValue(JOB);
    const queued = await startSync(mutationRequest("/api/connections/steam/sync", "POST"));
    expect(queued.status).toBe(202);
    expect(queueSteamSync).toHaveBeenCalledWith("secret-access");

    vi.mocked(getSteamSyncJob).mockResolvedValue(JOB);
    const status = await syncStatus(new Request(`http://${HOST}/api/connections/steam/sync/${JOB_ID}`), {
      params: Promise.resolve({ id: JOB_ID }),
    });
    expect(status.status).toBe(200);
    expect(getSteamSyncJob).toHaveBeenCalledWith("secret-access", JOB_ID);
  });

  it("rejects malformed job IDs and library offsets before forwarding", async () => {
    const badJob = await syncStatus(new Request(`http://${HOST}/api/connections/steam/sync/nope`), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(badJob.status).toBe(404);
    expect(getSteamSyncJob).not.toHaveBeenCalled();

    expect((await steamLibrary(new Request(`http://${HOST}/api/connections/steam/library?offset=-1`))).status).toBe(400);
    expect((await steamLibrary(new Request(`http://${HOST}/api/connections/steam/library?offset=0&offset=24`))).status).toBe(400);
    expect(getSteamLibrary).not.toHaveBeenCalled();
  });

  it("uses the fixed safe page size for imported libraries", async () => {
    vi.mocked(getSteamLibrary).mockResolvedValue(PAGE);
    const response = await steamLibrary(new Request(`http://${HOST}/api/connections/steam/library?offset=0`));
    expect(response.status).toBe(200);
    expect(getSteamLibrary).toHaveBeenCalledWith("secret-access", 24, 0);
  });
});
