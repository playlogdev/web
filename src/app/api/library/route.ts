import { NextResponse } from "next/server";
import { addLibraryEntry } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import {
  enforceCsrf,
  handleApiError,
  jsonError,
  noStoreHeaders,
  parseJsonBody,
} from "@/lib/auth/route-helpers";
import { validateAddLibraryEntry } from "@/lib/library";

/** Explicit BFF boundary for adding a game; browser code never sees bearer tokens. */
export async function POST(request: Request) {
  const csrf = enforceCsrf(request);
  if (csrf) {
    return csrf;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return jsonError(401, "Not signed in");
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const validation = validateAddLibraryEntry(parsed.body);
  if (!validation.valid) {
    return jsonError(400, validation.message);
  }

  try {
    const entry = await addLibraryEntry(accessToken, validation.value);
    return NextResponse.json(entry, {
      status: 201,
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
