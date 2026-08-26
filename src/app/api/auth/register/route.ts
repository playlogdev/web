import { NextResponse } from "next/server";
import { registerUser } from "@/lib/api/server";
import { handleApiError, enforceCsrf, jsonError, noStoreHeaders, parseJsonBody, requireString } from "@/lib/auth/route-helpers";
import { normalizeEmail, validatePassword, validateUsername } from "@/lib/validation";

export async function POST(request: Request) {
  const csrf = enforceCsrf(request);
  if (csrf) {
    return csrf;
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const email = normalizeEmail(requireString(parsed.body, "email"));
  const username = validateUsername(requireString(parsed.body, "username"));
  const password = validatePassword(requireString(parsed.body, "password"));

  if (!email) {
    return jsonError(400, "Enter a valid email address");
  }
  if (!username) {
    return jsonError(400, "Username must be 3-30 characters using only lowercase letters, numbers, and underscores");
  }
  if (!password) {
    return jsonError(400, "Password must be 8-72 bytes long");
  }

  try {
    const { body } = await registerUser({ email, username, password });
    return NextResponse.json(
      { id: body.id, email: body.email, username: body.username },
      { status: 201, headers: noStoreHeaders() },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
