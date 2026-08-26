import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { safeInternalPath } from "@/lib/validation";

/**
 * Session-expired landing point for Server Component redirects. Server
 * Components cannot mutate cookies, so when the authoritative session check
 * fails they route here: cookies are cleared locally and the user lands on
 * login with a validated internal return path. No upstream calls, GET only.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeInternalPath(url.searchParams.get("next"));

  await clearAuthCookies();

  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, url), {
    status: 303,
    headers: { "Cache-Control": "no-store" },
  });
}
