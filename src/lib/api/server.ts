import "server-only";
import { ApiError, GENERIC_UNAVAILABLE_MESSAGE, GENERIC_UNEXPECTED_MESSAGE } from "@/lib/api/errors";

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
