import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

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
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  getFeed: vi.fn(),
}));

import { GET as feedGet } from "@/app/api/feed/route";
import { DELETE as unfollowDelete, POST as followPost } from "@/app/api/users/[username]/follow/route";
import { followUser, getFeed, unfollowUser } from "@/lib/api/server";

const HOST = "localhost:3000";
const CONTEXT = { params: Promise.resolve({ username: "player_one" }) };

function mutationRequest(method: "POST" | "DELETE", origin = `http://${HOST}`) {
  return new Request(`http://${HOST}/api/users/player_one/follow`, {
    method,
    headers: {
      Host: HOST,
      Origin: origin,
      "Sec-Fetch-Site": origin === `http://${HOST}` ? "same-origin" : "cross-site",
    },
  });
}

describe("social BFF routes", () => {
  beforeEach(() => {
    vi.mocked(followUser).mockReset();
    vi.mocked(unfollowUser).mockReset();
    vi.mocked(getFeed).mockReset();
    store.get.mockReset();
    store.get.mockImplementation((name) => name === "playlog_at" ? { value: "secret-access" } : undefined);
  });

  it("rejects cross-site follow mutations before forwarding", async () => {
    const response = await followPost(mutationRequest("POST", "https://evil.example"), CONTEXT);
    expect(response.status).toBe(403);
    expect(followUser).not.toHaveBeenCalled();
  });

  it("requires a session and returns token-free 204 follow responses", async () => {
    store.get.mockReturnValueOnce(undefined);
    expect((await followPost(mutationRequest("POST"), CONTEXT)).status).toBe(401);

    const response = await followPost(mutationRequest("POST"), CONTEXT);
    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(followUser).toHaveBeenCalledWith("secret-access", "player_one");
    expect(await response.text()).not.toContain("secret-access");
  });

  it("forwards unfollow and preserves follow rate limits", async () => {
    expect((await unfollowDelete(mutationRequest("DELETE"), CONTEXT)).status).toBe(204);
    expect(unfollowUser).toHaveBeenCalledWith("secret-access", "player_one");

    vi.mocked(followUser).mockRejectedValueOnce(new ApiError(429, "too many requests", "expected", 9));
    const limited = await followPost(mutationRequest("POST"), CONTEXT);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("9");
  });

  it("keeps cursor pagination behind the BFF and rejects oversized cursors", async () => {
    vi.mocked(getFeed).mockResolvedValue({ events: [], next_cursor: null });
    const response = await feedGet(new Request(`http://${HOST}/api/feed?cursor=opaque%2Bcursor`));
    expect(response.status).toBe(200);
    expect(getFeed).toHaveBeenCalledWith("secret-access", "opaque+cursor", 12);
    expect(await response.text()).not.toContain("secret-access");

    const invalid = await feedGet(new Request(`http://${HOST}/api/feed?cursor=${"x".repeat(2049)}`));
    expect(invalid.status).toBe(400);
    expect(getFeed).toHaveBeenCalledTimes(1);
  });
});
