import { createHash } from "node:crypto";

export type RefreshDeps = {
  baseUrl: string;
  fetchImpl: typeof fetch;
  timeoutMs?: number;
};

export type RefreshOutcome =
  | { status: "ok"; accessToken: string; refreshToken: string; expiresIn: number }
  | { status: "invalid" }
  | { status: "unavailable"; retryAfter?: number };

export type TokenPairResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
};

function parseTokenPair(body: unknown): RefreshOutcome {
  if (typeof body !== "object" || body === null) {
    return { status: "unavailable" };
  }

  const pair = body as TokenPairResponse;
  if (
    typeof pair.access_token !== "string" ||
    typeof pair.refresh_token !== "string" ||
    typeof pair.expires_in !== "number" ||
    pair.expires_in <= 0
  ) {
    return { status: "unavailable" };
  }

  return {
    status: "ok",
    accessToken: pair.access_token,
    refreshToken: pair.refresh_token,
    expiresIn: pair.expires_in,
  };
}

async function doRefresh(
  deps: RefreshDeps,
  refreshToken: string,
): Promise<RefreshOutcome> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    deps.timeoutMs ?? 5000,
  );

  let response: Response;
  try {
    response = await deps.fetchImpl(`${deps.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    return { status: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) {
    // Unknown, expired, or reuse-detected refresh token: the session is gone.
    return { status: "invalid" };
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    return {
      status: "unavailable",
      retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    };
  }

  if (response.status !== 200) {
    return { status: "unavailable" };
  }

  try {
    return parseTokenPair(await response.json());
  } catch {
    return { status: "unavailable" };
  }
}

/**
 * Single-flight refresh coordinator.
 *
 * The Go API's refresh tokens are single-use: two concurrent refreshes with
 * the same token trigger reuse detection and revoke the whole session. This
 * coordinator guarantees at most one in-flight upstream refresh per refresh
 * token per process — every caller presenting the same token awaits the same
 * promise, and the key is removed only after the promise settles.
 *
 * Keyed by SHA-256 (never the raw token) so distinct sessions don't block
 * each other and token material never becomes a map key in logs/dumps.
 *
 * Residual race: with multiple Next.js server processes/instances, two
 * processes can still refresh the same token concurrently. See
 * docs/auth-architecture.md for the documented mitigation.
 */
export async function refreshAccessToken(
  deps: RefreshDeps,
  refreshToken: string,
  inFlight: Map<string, Promise<RefreshOutcome>> = defaultInFlight,
): Promise<RefreshOutcome> {
  const key = createHash("sha256").update(refreshToken).digest("hex");

  const existing = inFlight.get(key);
  if (existing) {
    return existing;
  }

  const promise = doRefresh(deps, refreshToken).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);

  return promise;
}

const defaultInFlight = new Map<string, Promise<RefreshOutcome>>();
