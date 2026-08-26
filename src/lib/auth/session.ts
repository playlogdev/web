import "server-only";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/auth/cookies";
import { getMe, type MeResponse } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import { safeInternalPath } from "@/lib/validation";

export type Session = MeResponse;

/**
 * Real session verification for Server Components. Cookie presence alone is
 * not proof of a valid session, so the access token is verified against the
 * API's /auth/me on protected pages.
 *
 * - No access cookie -> redirect to login (optimistic gate already handled
 *   the common case; this is the authoritative check).
 * - 401 from the API -> the access token is expired or the session is gone.
 *   Server Components cannot mutate cookies, so instead of attempting a
 *   refresh here (which would lose the rotated token and risk reuse
 *   detection), we route through /api/auth/expired, which clears cookies and
 *   lands on login. The client-side scheduled refresher normally prevents
 *   this path entirely.
 */
export async function requireSession(nextPath: string): Promise<Session> {
  const accessToken = await getAccessToken();
  const safeNext = safeInternalPath(nextPath);

  if (!accessToken) {
    redirect(`/login?next=${encodeURIComponent(safeNext)}`);
  }

  try {
    const { body } = await getMe(accessToken);
    return body;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/api/auth/expired?next=${encodeURIComponent(safeNext)}`);
    }

    // API unavailable: fail closed for protected pages rather than render
    // unauthenticated content.
    redirect(`/login?next=${encodeURIComponent(safeNext)}`);
  }
}

/** Best-effort session read that never redirects; null when unauthenticated. */
export async function getOptionalSession(): Promise<Session | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  try {
    const { body } = await getMe(accessToken);
    return body;
  } catch {
    return null;
  }
}
