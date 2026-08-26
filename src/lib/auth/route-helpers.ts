import { NextResponse } from "next/server";
import { toApiError } from "@/lib/api/errors";
import { isSameOriginMutation } from "@/lib/auth/csrf";

const MAX_BODY_BYTES = 16 * 1024;

export function noStoreHeaders(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

export function jsonError(status: number, message: string, retryAfter?: number): NextResponse {
  const headers = new Headers(noStoreHeaders());
  if (status === 429 && retryAfter !== undefined) {
    headers.set("Retry-After", String(Math.ceil(retryAfter)));
  }

  return NextResponse.json({ error: message }, { status, headers });
}

/** 403 for cross-site mutations; documents the dev/curl behavior. */
export function enforceCsrf(request: Request): NextResponse | null {
  const origin = request.headers.get("Origin");
  const secFetchSite = request.headers.get("Sec-Fetch-Site");
  const host = request.headers.get("Host");

  if (!host) {
    return jsonError(403, "Forbidden");
  }

  if (!isSameOriginMutation(origin, secFetchSite, host)) {
    return jsonError(403, "Forbidden");
  }

  return null;
}

export type ParsedBody = { ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse };

/** Enforces JSON content type, size limit, and object-shaped bodies. */
export async function parseJsonBody(request: Request): Promise<ParsedBody> {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, response: jsonError(415, "Expected application/json") };
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return { ok: false, response: jsonError(413, "Request body too large") };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, response: jsonError(400, "Malformed JSON body") };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, response: jsonError(400, "Malformed JSON body") };
  }

  return { ok: true, body: parsed as Record<string, unknown> };
}

export function requireString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" ? value : undefined;
}

/** Uniform handler error mapping: expected statuses pass through, 429 keeps Retry-After. */
export function handleApiError(error: unknown): NextResponse {
  const apiError = toApiError(error);

  if (apiError.kind === "expected" || apiError.kind === "unavailable") {
    return jsonError(apiError.status, apiError.message, apiError.retryAfter);
  }

  return jsonError(500, apiError.message);
}

