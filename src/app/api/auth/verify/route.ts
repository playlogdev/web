import { NextResponse } from "next/server";
import { verifyEmail } from "@/lib/api/server";
import { enforceCsrf, handleApiError, jsonError, noStoreHeaders, parseJsonBody, requireString } from "@/lib/auth/route-helpers";

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
  if (!token || token.length > 256) {
    return jsonError(400, "Missing or invalid verification token");
  }

  try {
    const { body } = await verifyEmail(token);
    return NextResponse.json(body, { status: 200, headers: noStoreHeaders() });
  } catch (error) {
    return handleApiError(error);
  }
}
