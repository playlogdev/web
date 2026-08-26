import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/api/server";
import { enforceCsrf, handleApiError, jsonError, noStoreHeaders, parseJsonBody, requireString } from "@/lib/auth/route-helpers";
import { validatePassword } from "@/lib/validation";

export async function POST(request: Request) {
  const csrf = enforceCsrf(request);
  if (csrf) {
    return csrf;
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const token = requireString(parsed.body, "token");
  const password = validatePassword(requireString(parsed.body, "password"));

  if (!token || token.length > 256) {
    return jsonError(400, "Missing or invalid reset token");
  }
  if (!password) {
    return jsonError(400, "Password must be 8-72 bytes long");
  }

  try {
    const { body } = await resetPassword(token, password);
    return NextResponse.json(body, { status: 200, headers: noStoreHeaders() });
  } catch (error) {
    return handleApiError(error);
  }
}
