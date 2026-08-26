import { NextResponse } from "next/server";
import { listSessions } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import { handleApiError, noStoreHeaders } from "@/lib/auth/route-helpers";

/** Active sessions for the account-security area. Requires a valid access token. */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401, headers: noStoreHeaders() });
  }

  try {
    const { body } = await listSessions(accessToken);
    return NextResponse.json(body, { status: 200, headers: noStoreHeaders() });
  } catch (error) {
    return handleApiError(error);
  }
}
