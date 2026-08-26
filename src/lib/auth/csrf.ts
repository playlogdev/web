/**
 * Same-origin check for cookie-authenticated mutation requests.
 *
 * Pure function so it is unit-testable. A mutation is accepted only when the
 * Origin host matches the request host AND Sec-Fetch-Site (when the browser
 * sends it) is "same-origin" or "none". A missing Origin with no fetch
 * metadata is rejected conservatively — browsers always attach Origin to
 * same-origin POST/PATCH fetches, so only non-browser clients omit it.
 */
export function isSameOriginMutation(
  originHeader: string | null,
  secFetchSiteHeader: string | null,
  requestHost: string,
): boolean {
  if (secFetchSiteHeader !== null) {
    const site = secFetchSiteHeader.trim().toLowerCase();
    if (site !== "same-origin" && site !== "none") {
      return false;
    }
  }

  if (originHeader === null) {
    // No Origin and no fetch metadata: cannot prove same-origin.
    return secFetchSiteHeader !== null ? secFetchSiteHeader.trim().toLowerCase() === "none" : false;
  }

  let originHost: string;
  try {
    const origin = new URL(originHeader);
    originHost = origin.host;
  } catch {
    return false;
  }

  return originHost === requestHost;
}
