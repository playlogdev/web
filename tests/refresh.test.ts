import { describe, expect, it, vi } from "vitest";
import { refreshAccessToken, type RefreshDeps, type RefreshOutcome } from "@/lib/auth/refresh";

function makeDeps(impl: (url: string, init?: RequestInit) => Promise<Response>): RefreshDeps {
  return { baseUrl: "http://api.test", fetchImpl: impl as typeof fetch };
}

function okPair(): Response {
  return new Response(
    JSON.stringify({ access_token: "at-2", refresh_token: "rt-2", expires_in: 900 }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("refreshAccessToken single-flight", () => {
  it("collapses concurrent calls with the same token into one upstream refresh", async () => {
    const fetchMock = vi.fn(async () => okPair());
    const deps = makeDeps(fetchMock);
    const inFlight = new Map<string, Promise<RefreshOutcome>>();

    const results = await Promise.all([
      refreshAccessToken(deps, "rt-1", inFlight),
      refreshAccessToken(deps, "rt-1", inFlight),
      refreshAccessToken(deps, "rt-1", inFlight),
      refreshAccessToken(deps, "rt-1", inFlight),
      refreshAccessToken(deps, "rt-1", inFlight),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const result of results) {
      expect(result).toEqual({
        status: "ok",
        accessToken: "at-2",
        refreshToken: "rt-2",
        expiresIn: 900,
      });
    }

    // The in-flight entry is removed after settling, so a later refresh with
    // a new token works immediately.
    await refreshAccessToken(deps, "rt-1", inFlight);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not block refreshes for different tokens", async () => {
    const fetchMock = vi.fn(async () => okPair());
    const deps = makeDeps(fetchMock);
    const inFlight = new Map<string, Promise<RefreshOutcome>>();

    await Promise.all([
      refreshAccessToken(deps, "rt-a", inFlight),
      refreshAccessToken(deps, "rt-b", inFlight),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps 401 to invalid (reuse detection / expiry)", async () => {
    const deps = makeDeps(async () => new Response(JSON.stringify({ error: "invalid refresh token" }), { status: 401 }));
    const result = await refreshAccessToken(deps, "rt-used", new Map());
    expect(result).toEqual({ status: "invalid" });
  });

  it("maps 429 to unavailable with Retry-After", async () => {
    const deps = makeDeps(async () => new Response("{}", { status: 429, headers: { "Retry-After": "12" } }));
    const result = await refreshAccessToken(deps, "rt", new Map());
    expect(result).toEqual({ status: "unavailable", retryAfter: 12 });
  });

  it("maps network failure and malformed responses to unavailable without throwing", async () => {
    const failing = makeDeps(async () => {
      throw new Error("boom");
    });
    expect(await refreshAccessToken(failing, "rt", new Map())).toEqual({ status: "unavailable" });

    const notJson = makeDeps(async () => new Response("<html>gateway</html>", { status: 200 }));
    expect(await refreshAccessToken(notJson, "rt", new Map())).toEqual({ status: "unavailable" });

    const malformed = makeDeps(
      async () => new Response("{broken", { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    expect(await refreshAccessToken(malformed, "rt", new Map())).toEqual({ status: "unavailable" });

    const missingFields = makeDeps(
      async () => new Response(JSON.stringify({ access_token: "x" }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    expect(await refreshAccessToken(missingFields, "rt", new Map())).toEqual({ status: "unavailable" });
  });
});
