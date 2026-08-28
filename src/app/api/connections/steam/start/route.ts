import { NextResponse } from "next/server";
import { startSteamConnection } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import {
  enforceCsrf,
  handleApiError,
  jsonError,
  noStoreHeaders,
} from "@/lib/auth/route-helpers";

export async function POST(request: Request) {
  const csrf = enforceCsrf(request);
  if (csrf) {
    return csrf;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return jsonError(401, "Not signed in");
  }

  try {
    const authorizationURL = await startSteamConnection(accessToken);
    return NextResponse.json(
      { authorization_url: authorizationURL },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
