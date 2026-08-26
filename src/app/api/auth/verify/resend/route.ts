import { NextResponse } from "next/server";
import { resendVerification } from "@/lib/api/server";
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
    // Enumeration-safe: invalid input gets the same response as an unknown
    // address. The upstream answers 200 regardless of account existence.
    return NextResponse.json({ status: "ok" }, { status: 200, headers: noStoreHeaders() });
  }

  try {
    const { body } = await resendVerification(email);
    return NextResponse.json(body, { status: 200, headers: noStoreHeaders() });
  } catch {
    // Enumeration-safe even on upstream failure: never reveal through error
    // behavior whether the address exists. The email simply may not arrive.
    return NextResponse.json({ status: "ok" }, { status: 200, headers: noStoreHeaders() });
  }
}

