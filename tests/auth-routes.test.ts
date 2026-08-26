import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

// Minimal NextResponse stand-in: handlers only use NextResponse.json.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => {
      const headers = new Headers(init?.headers);
      if (!headers.has("Cache-Control")) {
        headers.set("Cache-Control", "no-store");
      }
      return new Response(JSON.stringify(body), { ...init, headers });
    },
    redirect: (url: URL, init?: ResponseInit) =>
      new Response(null, { ...init, status: init?.status ?? 307, headers: { Location: url.toString() } }),
  },
}));

const store = {
  set: vi.fn<(name: string, value: string, options?: Record<string, unknown>) => void>(),
  get: vi.fn<(name: string) => { value: string } | undefined>(),
  has: vi.fn<(name: string) => boolean>(),
};

vi.mock("next/headers", () => ({
  cookies: async () => store,
}));

vi.mock("@/lib/api/server", () => ({
  login: vi.fn(),
  resendVerification: vi.fn(),
  logoutCurrent: vi.fn(),
}));

import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as resendPost } from "@/app/api/auth/verify/resend/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { login, logoutCurrent, resendVerification } from "@/lib/api/server";

const HOST = "localhost:3000";

function mutationRequest(body: string, extraHeaders: Record<string, string> = {}): Request {
  return new Request(`http://${HOST}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: HOST,
      Origin: `http://${HOST}`,
      "Sec-Fetch-Site": "same-origin",
      ...extraHeaders,
    },
    body,
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
    store.set.mockClear();
    vi.stubEnv("NODE_ENV", "test");
  });

  it("rejects cross-site mutations with 403", async () => {
    const response = await loginPost(
      mutationRequest("{}", { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects malformed JSON predictably", async () => {
    const response = await loginPost(mutationRequest("{broken"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Malformed JSON body");
  });

  it("rejects non-JSON content types", async () => {
    const response = await loginPost(
      new Request(`http://${HOST}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "text/plain", Host: HOST, Origin: `http://${HOST}` },
        body: "email=x",
      }),
    );
    expect(response.status).toBe(415);
  });

  it("sets HttpOnly session cookies on success and never returns tokens", async () => {
    vi.mocked(login).mockResolvedValue({
      status: 200,
      body: { access_token: "secret-at", refresh_token: "secret-rt", expires_in: 900 },
      retryAfter: undefined,
    });

    const response = await loginPost(
      mutationRequest(JSON.stringify({ email: "user@example.com", password: "password123" })),
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    // No token material anywhere in the browser-visible body.
    expect(text).not.toContain("secret-at");
    expect(text).not.toContain("secret-rt");

    const accessCall = store.set.mock.calls.find((c) => c[0] === "playlog_at");
    const refreshCall = store.set.mock.calls.find((c) => c[0] === "playlog_rt");
    expect(accessCall?.[1]).toBe("secret-at");
    expect(accessCall?.[2]).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 900 });
    expect(refreshCall?.[2]).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("maps invalid credentials to 401 with the API message", async () => {
    vi.mocked(login).mockRejectedValue(
      new ApiError(401, "invalid email or password"),
    );

    const response = await loginPost(
      mutationRequest(JSON.stringify({ email: "user@example.com", password: "wrongpassword" })),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("invalid email or password");
  });

  it("maps unverified email to 403", async () => {
    vi.mocked(login).mockRejectedValue(
      new ApiError(403, "email not verified"),
    );

    const response = await loginPost(
      mutationRequest(JSON.stringify({ email: "user@example.com", password: "password123" })),
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("email not verified");
  });

  it("forwards Retry-After on rate limiting", async () => {
    vi.mocked(login).mockRejectedValue(
      new ApiError(429, "too many requests, try again later", "expected", 17),
    );

    const response = await loginPost(
      mutationRequest(JSON.stringify({ email: "user@example.com", password: "password123" })),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("17");
  });

  it("maps upstream unavailability to 503 without leaking internals", async () => {
    vi.mocked(login).mockRejectedValue(
      new ApiError(503, "Service temporarily unavailable", "unavailable"),
    );

    const response = await loginPost(
      mutationRequest(JSON.stringify({ email: "user@example.com", password: "password123" })),
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("Service temporarily unavailable");
  });
});

describe("POST /api/auth/verify/resend (enumeration safety)", () => {
  beforeEach(() => {
    vi.mocked(resendVerification).mockReset();
  });

  it("answers identically for unknown addresses and upstream failures", async () => {
    vi.mocked(resendVerification).mockResolvedValue({ status: 200, body: { status: "ok" }, retryAfter: undefined });
    const known = await resendPost(mutationRequest(JSON.stringify({ email: "known@example.com" })));

    vi.mocked(resendVerification).mockRejectedValue(
      new ApiError(503, "Service temporarily unavailable", "unavailable"),
    );
    const unknown = await resendPost(mutationRequest(JSON.stringify({ email: "unknown@example.com" })));

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
  });

  it("answers identically for invalid input", async () => {
    const response = await resendPost(mutationRequest(JSON.stringify({ email: "garbage" })));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});

describe("POST /api/auth/logout (cleanup behavior)", () => {
  beforeEach(() => {
    vi.mocked(logoutCurrent).mockReset();
    store.set.mockClear();
    vi.stubEnv("NODE_ENV", "test");
  });

  it("clears cookies and reports upstream revocation on success", async () => {
    vi.mocked(logoutCurrent).mockResolvedValue({ status: 204, body: undefined, retryAfter: undefined });
    store.get.mockImplementation((name) => (name === "playlog_at" ? { value: "at" } : undefined));

    const response = await logoutPost(mutationRequest("{}"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, upstream_revoked: true });
    const cleared = store.set.mock.calls.filter((c) => c[2] && (c[2] as { maxAge?: number }).maxAge === 0);
    expect(cleared.length).toBe(3);
  });

  it("still clears cookies when the upstream is unavailable, but says so honestly", async () => {
    vi.mocked(logoutCurrent).mockRejectedValue(
      new ApiError(503, "Service temporarily unavailable", "unavailable"),
    );
    store.get.mockImplementation((name) => (name === "playlog_at" ? { value: "at" } : undefined));

    const response = await logoutPost(mutationRequest("{}"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, upstream_revoked: false });
    const cleared = store.set.mock.calls.filter((c) => c[2] && (c[2] as { maxAge?: number }).maxAge === 0);
    expect(cleared.length).toBe(3);
  });
});



