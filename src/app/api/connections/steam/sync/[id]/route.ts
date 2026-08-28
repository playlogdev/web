import { NextResponse } from "next/server";
import { getSteamSyncJob } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import {
  handleApiError,
  jsonError,
  noStoreHeaders,
} from "@/lib/auth/route-helpers";
import { isSteamSyncJobId } from "@/lib/steam";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return jsonError(401, "Not signed in");
  }

  const { id } = await context.params;
  if (!isSteamSyncJobId(id)) {
    return jsonError(404, "Sync job not found");
  }

  try {
    const job = await getSteamSyncJob(accessToken, id);
    return NextResponse.json(job, { headers: noStoreHeaders() });
  } catch (error) {
    return handleApiError(error);
  }
}
