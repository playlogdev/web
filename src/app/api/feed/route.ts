import { NextResponse } from "next/server";
import { getFeed } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import {
  handleApiError,
  jsonError,
  noStoreHeaders,
} from "@/lib/auth/route-helpers";
import { isSafeFeedCursor } from "@/lib/social";

const PAGE_SIZE = 12;

export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return jsonError(401, "Not signed in");
  }

  const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
  if (cursor !== undefined && !isSafeFeedCursor(cursor)) {
    return jsonError(400, "Invalid cursor");
  }

  try {
    const page = await getFeed(accessToken, cursor, PAGE_SIZE);
    return NextResponse.json(page, { headers: noStoreHeaders() });
  } catch (error) {
    return handleApiError(error);
  }
}
