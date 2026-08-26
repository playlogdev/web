import { NextResponse } from "next/server";
import { logoutAllSessions } from "@/lib/api/server";
import { clearAuthCookies, getAccessToken, getRefreshToken, setAccessCookie, setRefreshCookie } from "@/lib/auth/cookies";
import { enforceCsrf, handleApiError, jsonError, noStoreHeaders } from "@/lib/auth/route-helpers";
import { refreshAccessToken } from "@/lib/auth/refresh";
import { ApiError } from "@/lib/api/errors";

/**
 * Revoke every session for the account. Requires a working upstream call, so
 * unlike single-session logout this reports explicit success or failure. If
 * the access token is expired, the central single-flight coordinator is used
 * to obtain a fresh one first — no separate refresh implementation.
 */
export async function POST(request: Request) {
  const csrf = enforceCsrf(request);
  if (csrf) {
    return csrf;
  }

  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    return jsonError(500, "Something went wrong. Try again.");
  }

  let accessToken = await getAccessToken();

  try {
    if (!accessToken) {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        return jsonError(401, "Not signed in");
      }

      const outcome = await refreshAccessToken({ baseUrl, fetchImpl: fetch }, refreshToken);
      if (outcome.status !== "ok") {
        await clearAuthCookies();
        return jsonError(401, "Session expired. Please sign in again.");
      }

      await setAccessCookie(outcome.accessToken, outcome.expiresIn);
      await setRefreshCookie(outcome.refreshToken);
      accessToken = outcome.accessToken;
    }

    try {
      await logoutAllSessions(accessToken);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Access token rejected mid-flight: refresh once via the coordinator
        // and retry exactly once.
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          await clearAuthCookies();
          return jsonError(401, "Session expired. Please sign in again.");
        }

        const outcome = await refreshAccessToken({ baseUrl, fetchImpl: fetch }, refreshToken);
        if (outcome.status !== "ok") {
          await clearAuthCookies();
          return jsonError(401, "Session expired. Please sign in again.");
        }

        await setAccessCookie(outcome.accessToken, outcome.expiresIn);
        await setRefreshCookie(outcome.refreshToken);
        await logoutAllSessions(outcome.accessToken);
      } else {
        throw error;
      }
    }

    await clearAuthCookies();

    return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders() });
  } catch (error) {
    // Upstream failure: the sessions were NOT provably revoked. Do not clear
    // local cookies as if it succeeded; surface the failure honestly.
    return handleApiError(error);
  }
}

