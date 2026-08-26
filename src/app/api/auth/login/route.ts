import { NextResponse } from "next/server";
import { login } from "@/lib/api/server";
import { enforceCsrf, handleApiError, jsonError, noStoreHeaders, parseJsonBody, requireString } from "@/lib/auth/route-helpers";
import { setAccessCookie, setRefreshCookie } from "@/lib/auth/cookies";
import { normalizeEmail, validatePassword } from "@/lib/validation";

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
  const password = validatePassword(requireString(parsed.body, "password"));
  if (!email || !password) {
    // Same message for unknown email and bad password shape: the upstream
    // makes no distinction either, so neither do we.
    return jsonError(401, "Invalid email or password");
  }

  try {
    const { body } = await login({ email, password });

    // Tokens go into HttpOnly cookies only — never into the response body.
    await setAccessCookie(body.access_token, body.expires_in);
    await setRefreshCookie(body.refresh_token);

    return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders() });
  } catch (error) {
    return handleApiError(error);
  }
}
