import { NextResponse } from "next/server";
import { getSteamLibrary } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import {
  handleApiError,
  jsonError,
  noStoreHeaders,
} from "@/lib/auth/route-helpers";
import { isSteamLibraryOffset, STEAM_LIBRARY_PAGE_SIZE } from "@/lib/steam";

export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return jsonError(401, "Not signed in");
  }

  const searchParams = new URL(request.url).searchParams;
  const offsets = searchParams.getAll("offset");
  const rawOffset = offsets.length === 0 ? "0" : offsets[0];
  if (offsets.length > 1 || !isSteamLibraryOffset(rawOffset)) {
    return jsonError(400, "Invalid offset");
  }

  try {
    const page = await getSteamLibrary(
      accessToken,
      STEAM_LIBRARY_PAGE_SIZE,
      Number(rawOffset),
    );
    return NextResponse.json(page, { headers: noStoreHeaders() });
  } catch (error) {
    return handleApiError(error);
  }
}
