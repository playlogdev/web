import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, setAccessCookie, setRefreshCookie } from "@/lib/auth/cookies";

const store = { set: vi.fn<(name: string, value: string, options?: Record<string, unknown>) => void>() };

vi.mock("next/headers", () => ({
  cookies: async () => store,
}));

describe("auth cookies", () => {
  beforeEach(() => {
    store.set.mockClear();
    vi.stubEnv("NODE_ENV", "production");
  });

  it("sets the access cookie with HttpOnly, Secure, SameSite, Path, and expires_in lifetime", async () => {
    await setAccessCookie("token-value", 900);

    const call = store.set.mock.calls.find((c) => c[0] === ACCESS_COOKIE);
    expect(call?.[1]).toBe("token-value");
    expect(call?.[2]).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });
  });

  it("sets the refresh cookie with the 30-day documented lifetime", async () => {
    await setRefreshCookie("rt-value");

    const call = store.set.mock.calls.find((c) => c[0] === REFRESH_COOKIE);
    expect(call?.[2]).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  });

  it("clears all auth cookies with maxAge 0", async () => {
    await clearAuthCookies();

    const cleared = store.set.mock.calls.filter((c) => c[2] && (c[2] as { maxAge?: number }).maxAge === 0);
    expect(cleared.map((c) => c[0]).sort()).toEqual(["playlog_at", "playlog_at_exp", "playlog_rt"].sort());
  });

  it("is not Secure outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    await setAccessCookie("token", 60);

    const call = store.set.mock.calls.find((c) => c[0] === ACCESS_COOKIE);
    expect(call?.[2]?.secure).toBe(false);
  });
});
