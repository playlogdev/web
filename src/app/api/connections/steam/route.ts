import { NextResponse } from "next/server";
import { disconnectSteam, getSteamConnection } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import {
  enforceCsrf,
  handleApiError,
  jsonError,
  noStoreHeaders,
} from "@/lib/auth/route-helpers";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return jsonError(401, "Not signed in");
  }

  try {
    const connection = await getSteamConnection(accessToken);
    return NextResponse.json(connection, { headers: noStoreHeaders() });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  const csrf = enforceCsrf(request);
  if (csrf) {
    return csrf;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return jsonError(401, "Not signed in");
  }

  try {
    await disconnectSteam(accessToken);
    return new NextResponse(null, { status: 204, headers: noStoreHeaders() });
  } catch (error) {
    return handleApiError(error);
  }
}
