import { NextResponse } from "next/server";
import { changePassword } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import { enforceCsrf, handleApiError, jsonError, noStoreHeaders, parseJsonBody, requireString } from "@/lib/auth/route-helpers";
import { validatePassword } from "@/lib/validation";

/** Change password for the signed-in account. Requires a valid access token. */
export async function PATCH(request: Request) {
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

  const currentPassword = requireString(parsed.body, "current_password");
  const newPassword = validatePassword(requireString(parsed.body, "new_password"));

  if (typeof currentPassword !== "string" || currentPassword.length === 0) {
    return jsonError(400, "Current password is required");
  }
  if (!newPassword) {
    return jsonError(400, "New password must be 8-72 bytes long");
  }

  try {
    const { body } = await changePassword(accessToken, currentPassword, newPassword);
    return NextResponse.json(body, { status: 200, headers: noStoreHeaders() });
  } catch (error) {
    return handleApiError(error);
  }
}
