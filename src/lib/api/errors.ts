export type ApiErrorKind =
  | "expected"
  | "unavailable"
  | "unexpected";

/**
 * Normalized error for every failure mode of the server-side API client.
 * `message` is always safe to show to browsers: either the API's own
 * human-readable error string or a generic substitute.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  /** Seconds, only present when the upstream sent Retry-After on a 429. */
  readonly retryAfter?: number;

  constructor(
    status: number,
    message: string,
    kind: ApiErrorKind = "expected",
    retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind;
    this.retryAfter = retryAfter;
  }
}

export const GENERIC_UNAVAILABLE_MESSAGE = "Service temporarily unavailable";
export const GENERIC_UNEXPECTED_MESSAGE = "Something went wrong. Try again.";

/** Maps any thrown value to an ApiError so handlers have one shape to handle. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(500, GENERIC_UNEXPECTED_MESSAGE, "unexpected");
}
