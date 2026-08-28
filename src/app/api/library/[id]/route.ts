import { NextResponse } from "next/server";
import { updateLibraryEntry } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import {
  enforceCsrf,
  handleApiError,
  jsonError,
  noStoreHeaders,
  parseJsonBody,
} from "@/lib/auth/route-helpers";
import {
  isLibraryEntryId,
  validateUpdateLibraryEntry,
} from "@/lib/library";

type RouteContext = { params: Promise<{ id: string }> };

/** Ownership is enforced upstream; malformed IDs use the same non-enumerating 404. */
export async function PATCH(request: Request, context: RouteContext) {
  const csrf = enforceCsrf(request);
  if (csrf) {
    return csrf;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return jsonError(401, "Not signed in");
  }

  const { id } = await context.params;
  if (!isLibraryEntryId(id)) {
    return jsonError(404, "Library entry not found");
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const validation = validateUpdateLibraryEntry(parsed.body);
  if (!validation.valid) {
    return jsonError(400, validation.message);
  }

  try {
    const entry = await updateLibraryEntry(
      accessToken,
      id,
      validation.value,
    );
    return NextResponse.json(entry, {
      status: 200,
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
