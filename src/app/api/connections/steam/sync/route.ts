import { NextResponse } from "next/server";
import { queueSteamSync } from "@/lib/api/server";
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
    const job = await queueSteamSync(accessToken);
    return NextResponse.json(job, { status: 202, headers: noStoreHeaders() });
  } catch (error) {
    return handleApiError(error);
  }
}
