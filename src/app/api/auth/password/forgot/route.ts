import { NextResponse } from "next/server";
import { forgotPassword } from "@/lib/api/server";
import { enforceCsrf, noStoreHeaders, parseJsonBody, requireString } from "@/lib/auth/route-helpers";
import { normalizeEmail } from "@/lib/validation";

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
  if (!email) {
    // Enumeration-safe: identical response for invalid and unknown addresses.
    return NextResponse.json({ status: "ok" }, { status: 200, headers: noStoreHeaders() });
  }

  try {
    const { body } = await forgotPassword(email);
    return NextResponse.json(body, { status: 200, headers: noStoreHeaders() });
  } catch {
    // Enumeration-safe even on upstream failure.
    return NextResponse.json({ status: "ok" }, { status: 200, headers: noStoreHeaders() });
  }
}

