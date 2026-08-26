import { NextResponse } from "next/server";
import { logoutCurrent } from "@/lib/api/server";
import { clearAuthCookies, getAccessToken } from "@/lib/auth/cookies";
import { enforceCsrf, noStoreHeaders } from "@/lib/auth/route-helpers";
import { ApiError } from "@/lib/api/errors";

/**
 * Current-session logout. Best-effort upstream revocation: local cookies are
 * always cleared, but the response tells the truth about whether the API
 * session was actually revoked (`upstream_revoked`), so the UI never claims
 * more than happened.
 */
export async function POST(request: Request) {
  const csrf = enforceCsrf(request);
  if (csrf) {
    return csrf;
  }

  const accessToken = await getAccessToken();
  let upstreamRevoked = false;

  if (accessToken) {
    try {
      await logoutCurrent(accessToken);
      upstreamRevoked = true;
    } catch (error) {
      // 401: token already invalid/expired — the session is effectively
      // gone, so treat it as revoked. Anything else: API unreachable or
      // failing; cookies are still cleared but we say so honestly.
      if (error instanceof ApiError && error.status === 401) {
        upstreamRevoked = true;
      }
    }
  } else {
    // No access token to present: nothing to revoke upstream.
    upstreamRevoked = true;
  }

  await clearAuthCookies();

  return NextResponse.json({ ok: true, upstream_revoked: upstreamRevoked }, { status: 200, headers: noStoreHeaders() });
}

