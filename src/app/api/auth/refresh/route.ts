import { NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/auth/refresh";
import { clearAuthCookies, getRefreshToken, setAccessCookie, setRefreshCookie } from "@/lib/auth/cookies";
import { enforceCsrf, handleApiError, jsonError, noStoreHeaders } from "@/lib/auth/route-helpers";
import { ApiError } from "@/lib/api/errors";

/**
 * Explicit refresh endpoint. The browser client (scheduled refresher or a
 * 401 recovery path) calls this; the server-side single-flight coordinator
 * guarantees one upstream refresh per token even under concurrent calls.
 * The rotated pair is written back to HttpOnly cookies; the browser never
 * sees token material.
 */
export async function POST(request: Request) {
  const csrf = enforceCsrf(request);
  if (csrf) {
    return csrf;
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return jsonError(401, "Not signed in");
  }

  try {
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) {
      return jsonError(500, "Something went wrong. Try again.");
    }

    const outcome = await refreshAccessToken({ baseUrl, fetchImpl: fetch }, refreshToken);

    if (outcome.status === "ok") {
      await setAccessCookie(outcome.accessToken, outcome.expiresIn);
      await setRefreshCookie(outcome.refreshToken);
      return NextResponse.json({ ok: true, expiresIn: outcome.expiresIn }, { status: 200, headers: noStoreHeaders() });
    }

    // Reuse detection, expiry, or revocation: sign the browser out locally.
    if (outcome.status === "invalid") {
      await clearAuthCookies();
      return jsonError(401, "Session expired. Please sign in again.");
    }

    // Upstream unavailable: keep cookies so the retry can succeed later.
    return jsonError(503, "Service temporarily unavailable", outcome.retryAfter);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.status, error.message, error.retryAfter);
    }
    return handleApiError(error);
  }
}
