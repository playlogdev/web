import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/home", "/library", "/discover", "/activity", "/profile"];
const REFRESH_COOKIE = "playlog_rt";

/**
 * Optimistic route gating ONLY.
 *
 * - No Go API calls, no token refresh, no verification: cookie presence is
 *   not proof of a valid session. Real authorization happens in the
 *   server-only session layer (requireSession) on every protected page and
 *   in every cookie-authenticated Route Handler.
 * - The refresh cookie is long-lived, so its presence is a cheap hint that a
 *   session may exist. Absence is a reliable sign there is nothing to show.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!request.cookies.has(REFRESH_COOKIE)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Pass the original path downstream so the protected layout can build a
  // safe return path after authoritative verification.
  const headers = new Headers(request.headers);
  headers.set("x-playlog-next", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|brand|robots.txt|sitemap.xml).*)",
  ],
};
