import { cookies } from "next/headers";

export const ACCESS_COOKIE = "playlog_at";
export const REFRESH_COOKIE = "playlog_rt";
/** Non-secret: epoch seconds when the access token expires. Refresh scheduling only. */
export const ACCESS_EXPIRY_COOKIE = "playlog_at_exp";

export const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secureFlag(): boolean {
  return process.env.NODE_ENV === "production";
}

function baseOptions() {
  return {
    httpOnly: true,
    secure: secureFlag(),
    sameSite: "lax" as const,
    path: "/",
  };
}

/**
 * Access-token cookie: lifetime mirrors the API's expires_in so the browser
 * never holds a token cookie past its validity window.
 */
export async function setAccessCookie(accessToken: string, expiresIn: number) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, {
    ...baseOptions(),
    maxAge: expiresIn > 0 ? expiresIn : 900,
  });
  store.set(ACCESS_EXPIRY_COOKIE, String(Math.floor(Date.now() / 1000) + expiresIn), {
    httpOnly: false,
    secure: secureFlag(),
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn > 0 ? expiresIn : 900,
  });
}

/**
 * Refresh-token cookie: the API does not return the refresh token's expiry
 * (it is capped server-side at the session's absolute 30-day lifetime and
 * never extended by rotation). We mirror the documented 30-day default;
 * a cookie outliving server-side validity is harmless because every use is
 * validated by the API, and failure paths clear both cookies.
 */
export async function setRefreshCookie(refreshToken: string) {
  const store = await cookies();
  store.set(REFRESH_COOKIE, refreshToken, {
    ...baseOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.set(ACCESS_COOKIE, "", { ...baseOptions(), maxAge: 0 });
  store.set(REFRESH_COOKIE, "", { ...baseOptions(), maxAge: 0 });
  store.set(ACCESS_EXPIRY_COOKIE, "", {
    httpOnly: false,
    secure: secureFlag(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value;
}

export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value;
}

export async function hasSessionCookie(): Promise<boolean> {
  const store = await cookies();
  return store.has(REFRESH_COOKIE);
}
