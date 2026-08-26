import "server-only";
import { ApiError, GENERIC_UNAVAILABLE_MESSAGE, GENERIC_UNEXPECTED_MESSAGE } from "@/lib/api/errors";
import { parseGame, validateSearchQuery, type Game } from "@/lib/games";

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 64 * 1024;

function baseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new ApiError(500, GENERIC_UNEXPECTED_MESSAGE, "unexpected");
  }

  return url.replace(/\/+$/, "");
}

export type ApiResult<T> = { status: number; body: T; retryAfter?: number };

/**
 * Server-only fetch wrapper for the Go API. Never runs in the browser.
 *
 * Failure handling:
 * - network error / timeout -> 503 ApiError (generic message)
 * - non-JSON or malformed JSON -> 502 ApiError (generic message)
 * - JSON body with {error} -> that status + the API's safe message
 * - other statuses -> generic message for 5xx, API message otherwise
 */
export async function apiRequest<T>(
  method: string,
  path: string,
  options: {
    body?: unknown;
    authToken?: string;
    timeoutMs?: number;
  } = {},
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.authToken) {
    headers.Authorization = `Bearer ${options.authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    clearTimeout(timeout);
    throw new ApiError(503, GENERIC_UNAVAILABLE_MESSAGE, "unavailable");
  }
  clearTimeout(timeout);

  const retryAfterHeader = response.headers.get("Retry-After");
  const retryAfterNumber = retryAfterHeader === null ? undefined : Number(retryAfterHeader);
  const retryAfter =
    retryAfterNumber !== undefined && Number.isFinite(retryAfterNumber) && retryAfterNumber > 0
      ? retryAfterNumber
      : undefined;

  const contentType = response.headers.get("Content-Type") ?? "";
  const rawBody = await response.text();
  if (rawBody.length > MAX_RESPONSE_BYTES) {
    throw new ApiError(502, GENERIC_UNEXPECTED_MESSAGE, "unexpected");
  }

  let parsed: unknown = undefined;
  if (rawBody.length > 0) {
    if (!contentType.includes("application/json")) {
      throw new ApiError(502, GENERIC_UNEXPECTED_MESSAGE, "unexpected");
    }
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new ApiError(502, GENERIC_UNEXPECTED_MESSAGE, "unexpected");
    }
  }

  if (!response.ok) {
    const apiMessage =
      typeof parsed === "object" && parsed !== null && typeof (parsed as { error?: unknown }).error === "string"
        ? (parsed as { error: string }).error
        : null;

    if (response.status >= 500) {
      throw new ApiError(response.status, GENERIC_UNEXPECTED_MESSAGE, "unexpected", retryAfter);
    }

    throw new ApiError(response.status, apiMessage ?? GENERIC_UNEXPECTED_MESSAGE, "expected", retryAfter);
  }

  return { status: response.status, body: parsed as T, retryAfter };
}

export type RegisterRequest = { email: string; username: string; password: string };
export type RegisterResponse = { id: string; email: string; username: string };

export type LoginRequest = { email: string; password: string };
export type TokenPair = { access_token: string; refresh_token: string; expires_in: number };

export type MeResponse = { id: string; email: string; verified: boolean };

export type SessionSummary = {
  id: string;
  created_at: string;
  expires_at: string;
  current: boolean;
};
export type SessionsResponse = { sessions: SessionSummary[] };

export function registerUser(body: RegisterRequest) {
  return apiRequest<RegisterResponse>("POST", "/auth/register", { body });
}

export function verifyEmail(token: string) {
  return apiRequest<{ status: string }>("POST", "/auth/verify", { body: { token } });
}

export function resendVerification(email: string) {
  return apiRequest<{ status: string }>("POST", "/auth/verify/resend", { body: { email } });
}

export function login(body: LoginRequest) {
  return apiRequest<TokenPair>("POST", "/auth/login", { body });
}

export function forgotPassword(email: string) {
  return apiRequest<{ status: string }>("POST", "/auth/password/forgot", { body: { email } });
}

export function resetPassword(token: string, password: string) {
  return apiRequest<{ status: string }>("POST", "/auth/password/reset", { body: { token, password } });
}

export function changePassword(authToken: string, currentPassword: string, newPassword: string) {
  return apiRequest<{ status: string }>("PATCH", "/auth/password", {
    authToken,
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

export function logoutCurrent(authToken: string) {
  return apiRequest<undefined>("POST", "/auth/logout", { authToken });
}

export function logoutAllSessions(authToken: string) {
  return apiRequest<undefined>("POST", "/auth/logout/all", { authToken });
}

export function listSessions(authToken: string) {
  return apiRequest<SessionsResponse>("GET", "/auth/sessions", { authToken });
}

export function getMe(authToken: string) {
  return apiRequest<MeResponse>("GET", "/auth/me", { authToken });
}

// ---------------------------------------------------------------------------
// Games (milestone 4)
// ---------------------------------------------------------------------------

export type GameSearchResponse = { games: Game[] };

export type GameStats = {
  backlog: number;
  playing: number;
  completed: number;
  dropped: number;
  total_logged: number;
  rating_count: number;
  average_rating: number | null;
};

export type FriendActivity = {
  username: string;
  status: "backlog" | "playing" | "completed" | "dropped";
  rating: number | null;
};

export type GameDetail = {
  game: Game;
  stats: GameStats;
  /** null: unauthenticated viewer; []: signed in, no followed friends logged it. */
  friendsActivity: FriendActivity[] | null;
};

const STATUSES = new Set(["backlog", "playing", "completed", "dropped"]);

function parseStats(body: unknown): GameStats | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const record = body as Record<string, unknown>;
  const counts = [
    "backlog",
    "playing",
    "completed",
    "dropped",
    "total_logged",
    "rating_count",
  ] as const;
  const result: GameStats = {
    backlog: 0,
    playing: 0,
    completed: 0,
    dropped: 0,
    total_logged: 0,
    rating_count: 0,
    average_rating: null,
  };
  for (const key of counts) {
    const value = record[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      return null;
    }
    result[key] = value;
  }

  const average = record.average_rating;
  if (
    average !== null &&
    (typeof average !== "number" ||
      !Number.isFinite(average) ||
      average < 0.5 ||
      average > 5)
  ) {
    return null;
  }
  if ((result.rating_count === 0) !== (average === null)) {
    return null;
  }
  if (
    result.backlog + result.playing + result.completed + result.dropped !==
    result.total_logged
  ) {
    return null;
  }
  result.average_rating = average as number | null;

  return result;
}

function parseFriendsActivity(body: unknown): FriendActivity[] | null | false {
  if (body === null) {
    return null;
  }
  if (!Array.isArray(body)) {
    return false;
  }

  const activity: FriendActivity[] = [];
  for (const entry of body) {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    const record = entry as Record<string, unknown>;
    if (
      typeof record.username !== "string" ||
      record.username.trim().length === 0 ||
      typeof record.status !== "string" ||
      !STATUSES.has(record.status)
    ) {
      return false;
    }
    if (
      record.rating !== null &&
      (typeof record.rating !== "number" ||
        !Number.isFinite(record.rating) ||
        record.rating < 0.5 ||
        record.rating > 5 ||
        !Number.isInteger(record.rating * 2))
    ) {
      return false;
    }
    activity.push({
      username: record.username,
      status: record.status as FriendActivity["status"],
      rating: record.rating as number | null,
    });
  }

  return activity;
}

export async function searchGames(authToken: string, query: string) {
  const validation = validateSearchQuery(query);
  if (!validation.valid) {
    const message =
      validation.reason === "too-long"
        ? "query must be at most 100 bytes"
        : "query must be at least 2 bytes";
    throw new ApiError(400, message, "expected");
  }
  if (!authToken) {
    throw new ApiError(401, "Authentication required", "expected");
  }

  // URLSearchParams encodes the untrusted query; never string-concatenated.
  const params = new URLSearchParams({ q: validation.query });
  const { body } = await apiRequest<unknown>(
    "GET",
    `/games/search?${params.toString()}`,
    { authToken },
  );

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as { games?: unknown }).games)
  ) {
    throw new ApiError(502, GENERIC_UNEXPECTED_MESSAGE, "unexpected");
  }

  const games: Game[] = [];
  const entries = (body as { games: unknown[] }).games;
  if (entries.length > 10) {
    throw new ApiError(502, GENERIC_UNEXPECTED_MESSAGE, "unexpected");
  }
  for (const entry of entries) {
    const game = parseGame(entry);
    if (game === null) {
      throw new ApiError(502, GENERIC_UNEXPECTED_MESSAGE, "unexpected");
    }
    games.push(game);
  }

  return games satisfies Game[];
}

/**
 * Game detail with optional authentication.
 *
 * A stale access token makes the otherwise-public endpoint return 401. In
 * that case we fall back exactly once to an anonymous request (public view,
 * friends_activity null) instead of making the page unavailable. Server
 * Components cannot refresh or mutate cookies, and the shell's scheduled
 * refresher normally prevents staleness. Only 401 falls back anonymously.
 */
export async function getGameDetail(
  igdbId: bigint,
  authToken: string | undefined,
): Promise<GameDetail> {
  const path = `/games/${igdbId.toString()}`;

  if (authToken) {
    try {
      return parseDetail(await apiRequest<unknown>("GET", path, { authToken }));
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
      // fall through to the single anonymous retry
    }
  }

  return parseDetail(await apiRequest<unknown>("GET", path));
}

function parseDetail(result: { body: unknown }): GameDetail {
  const body = result.body;
  if (typeof body !== "object" || body === null) {
    throw new ApiError(502, GENERIC_UNEXPECTED_MESSAGE, "unexpected");
  }

  const record = body as Record<string, unknown>;
  const game = parseGame(record.game);
  if (game === null) {
    throw new ApiError(502, GENERIC_UNEXPECTED_MESSAGE, "unexpected");
  }

  const stats = parseStats(record.stats);
  if (stats === null) {
    throw new ApiError(502, GENERIC_UNEXPECTED_MESSAGE, "unexpected");
  }

  const friends = parseFriendsActivity(record.friends_activity);
  if (friends === false) {
    throw new ApiError(502, GENERIC_UNEXPECTED_MESSAGE, "unexpected");
  }

  return { game, stats, friendsActivity: friends };
}
