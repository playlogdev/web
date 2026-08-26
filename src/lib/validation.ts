const USERNAME_PATTERN = /^[a-z0-9_]+$/;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const PASSWORD_MIN_BYTES = 8;
export const PASSWORD_MAX_BYTES = 72;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const email = raw.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return null;
  }

  return email;
}

export function validateUsername(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const username = raw.trim().toLowerCase();
  if (
    username.length < USERNAME_MIN ||
    username.length > USERNAME_MAX ||
    !USERNAME_PATTERN.test(username)
  ) {
    return null;
  }

  return username;
}

/** Password rules are byte-based (bcrypt's 72-byte cap), not char-based. */
export function passwordByteLength(raw: unknown): number | null {
  if (typeof raw !== "string") {
    return null;
  }

  return new TextEncoder().encode(raw).length;
}

export function validatePassword(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const bytes = passwordByteLength(raw);
  if (bytes === null || bytes < PASSWORD_MIN_BYTES || bytes > PASSWORD_MAX_BYTES) {
    return null;
  }

  return raw;
}

/**
 * Only same-origin absolute paths qualify: must start with a single "/",
 * must not start with "//" (protocol-relative), and must not contain a
 * backslash or scheme that could smuggle an external destination.
 */
export function safeInternalPath(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string") {
    return fallback;
  }

  const path = raw.trim();
  if (
    path.length === 0 ||
    path.length > 512 ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/\\") ||
    path.includes("\\") ||
    path.includes("://")
  ) {
    return fallback;
  }

  return path;
}

export function isValidEmailVerificationToken(raw: unknown): raw is string {
  return typeof raw === "string" && raw.length >= 16 && raw.length <= 256;
}
