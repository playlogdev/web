import { NextResponse } from "next/server";
import { followUser, unfollowUser } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import {
  enforceCsrf,
  handleApiError,
  jsonError,
  noStoreHeaders,
} from "@/lib/auth/route-helpers";
import { isUsername } from "@/lib/social";

type RouteContext = { params: Promise<{ username: string }> };

export async function POST(request: Request, context: RouteContext) {
  return changeFollowState(request, context, true);
}

export async function DELETE(request: Request, context: RouteContext) {
  return changeFollowState(request, context, false);
}

async function changeFollowState(
  request: Request,
  context: RouteContext,
  following: boolean,
) {
  const csrf = enforceCsrf(request);
  if (csrf) {
    return csrf;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return jsonError(401, "Not signed in");
  }

  const { username } = await context.params;
  if (!isUsername(username)) {
    return jsonError(404, "User not found");
  }

  try {
    if (following) {
      await followUser(accessToken, username);
    } else {
      await unfollowUser(accessToken, username);
    }
    return new NextResponse(null, { status: 204, headers: noStoreHeaders() });
  } catch (error) {
    return handleApiError(error);
  }
}
