import { NextResponse } from "next/server";
import { getMe } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import { jsonError, noStoreHeaders } from "@/lib/auth/route-helpers";
import { ApiError } from "@/lib/api/errors";

/**
 * Non-secret session state for the browser: whether a verified session
 * exists and the account email/verification flag. Read-only — no token
 * refresh or cookie mutation happens here (GET performs no mutations).
 */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 200, headers: noStoreHeaders() });
  }

  try {
    const { body } = await getMe(accessToken);
    return NextResponse.json(
      { authenticated: true, email: body.email, verified: body.verified },
      { status: 200, headers: noStoreHeaders() },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return NextResponse.json({ authenticated: false }, { status: 200, headers: noStoreHeaders() });
    }
    return jsonError(503, "Service temporarily unavailable");
  }
}
