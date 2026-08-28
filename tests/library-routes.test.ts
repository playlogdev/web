import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { LibraryEntry } from "@/lib/library";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

const store = {
  get: vi.fn<(name: string) => { value: string } | undefined>(),
};

vi.mock("next/headers", () => ({
  cookies: async () => store,
}));

vi.mock("@/lib/api/server", () => ({
  addLibraryEntry: vi.fn(),
  updateLibraryEntry: vi.fn(),
}));

import { POST as addPost } from "@/app/api/library/route";
import { PATCH as updatePatch } from "@/app/api/library/[id]/route";
import {
  addLibraryEntry,
  updateLibraryEntry,
} from "@/lib/api/server";

const HOST = "localhost:3000";
const ENTRY_ID = "00000000-0000-4000-8000-000000000001";
const ENTRY: LibraryEntry = {
  id: ENTRY_ID,
  status: "backlog",
  rating: null,
  review: null,
  started_at: null,
  completed_at: null,
  game: { igdb_id: 1020, name: "Hollow Knight" },
  created_at: "2026-08-20T12:00:00Z",
  updated_at: "2026-08-20T12:00:00Z",
};

function request(
  body: unknown,
  method: "POST" | "PATCH" = "POST",
  headers: Record<string, string> = {},
) {
  return new Request(`http://${HOST}/api/library`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Host: HOST,
      Origin: `http://${HOST}`,
      "Sec-Fetch-Site": "same-origin",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("library BFF mutation routes", () => {
  beforeEach(() => {
    vi.mocked(addLibraryEntry).mockReset();
    vi.mocked(updateLibraryEntry).mockReset();
    store.get.mockReset();
    store.get.mockImplementation((name) =>
      name === "playlog_at" ? { value: "secret-access" } : undefined,
    );
  });

  it("rejects cross-site add attempts before forwarding", async () => {
    const response = await addPost(
      request(
        { igdb_id: 1020 },
        "POST",
        { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" },
      ),
    );
    expect(response.status).toBe(403);
    expect(addLibraryEntry).not.toHaveBeenCalled();
  });

  it("requires the HttpOnly-backed authenticated session", async () => {
    store.get.mockReturnValue(undefined);
    const response = await addPost(request({ igdb_id: 1020 }));
    expect(response.status).toBe(401);
    expect(addLibraryEntry).not.toHaveBeenCalled();
  });

  it("validates and forwards an add without returning token material", async () => {
    vi.mocked(addLibraryEntry).mockResolvedValue(ENTRY);
    const response = await addPost(
      request({ igdb_id: 1020, status: "backlog" }),
    );
    const text = await response.text();

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(addLibraryEntry).toHaveBeenCalledWith("secret-access", {
      igdb_id: 1020,
      status: "backlog",
    });
    expect(text).not.toContain("secret-access");
  });

  it("preserves a duplicate-add conflict and Retry-After", async () => {
    vi.mocked(addLibraryEntry).mockRejectedValueOnce(
      new ApiError(409, "game already in library"),
    );
    expect((await addPost(request({ igdb_id: 1020 }))).status).toBe(409);

    vi.mocked(addLibraryEntry).mockRejectedValueOnce(
      new ApiError(
        429,
        "too many requests, try again later",
        "expected",
        12,
      ),
    );
    const limited = await addPost(request({ igdb_id: 1020 }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("12");
  });

  it("rejects malformed entry IDs without forwarding", async () => {
    const response = await updatePatch(request({ status: "playing" }, "PATCH"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(response.status).toBe(404);
    expect(updateLibraryEntry).not.toHaveBeenCalled();
  });

  it("preserves explicit null fields on update", async () => {
    vi.mocked(updateLibraryEntry).mockResolvedValue({
      ...ENTRY,
      status: "playing",
    });
    const response = await updatePatch(
      request(
        {
          status: "playing",
          rating: null,
          review: null,
          started_at: null,
          completed_at: null,
        },
        "PATCH",
      ),
      { params: Promise.resolve({ id: ENTRY_ID }) },
    );

    expect(response.status).toBe(200);
    expect(updateLibraryEntry).toHaveBeenCalledWith(
      "secret-access",
      ENTRY_ID,
      {
        status: "playing",
        rating: null,
        review: null,
        started_at: null,
        completed_at: null,
      },
    );
  });
});
