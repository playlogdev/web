"use client";

/**
 * Browser-side refresh trigger. This module never sees token material: it
 * only POSTs to the BFF refresh endpoint and reads the non-secret expiry
 * cookie to schedule the next attempt.
 *
 * Multi-tab coordination: navigator.locks (Web Locks) serializes refresh
 * attempts across tabs so only one tab performs a refresh for a given
 * moment; a BroadcastChannel tells the other tabs to reschedule from the
 * renewed expiry cookie. Fallback without Web Locks: an in-tab in-flight
 * promise still prevents duplicate refreshes within one tab. Residual
 * limitation: without Web Locks, two tabs can both call the endpoint; the
 * server-side single-flight coordinator collapses them into one upstream
 * refresh when they share a server process.
 */

const LOCK_NAME = "playlog-refresh";
const REFRESH_MARGIN_SECONDS = 30;

let inFlight: Promise<boolean> | null = null;
let channel: BroadcastChannel | null = null;
let scheduledTimer: ReturnType<typeof setTimeout> | null = null;

function getAccessExpiryEpoch(): number | null {
  const match = document.cookie.match(/(?:^|;\s*)playlog_at_exp=(\d+)/);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function broadcastReschedule() {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }
  channel ??= new BroadcastChannel("playlog-session");
  channel.postMessage({ type: "session-refreshed" });
}

async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      credentials: "same-origin",
    });

    if (response.ok) {
      broadcastReschedule();
      scheduleFromCookie();
      return true;
    }

    if (response.status === 401 || response.status === 403) {
      // Session is gone (cookies were cleared server-side): hard-navigate so
      // all cached RSC state and timers reset. router.push would leave stale
      // server-component caches in other states of this module.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return false;
    }

    // 429/5xx: transient. Retry at the next scheduling opportunity.
    scheduleFromCookie(60);
    return false;
  } catch {
    scheduleFromCookie(60);
    return false;
  }
}

export async function triggerRefresh(): Promise<boolean> {
  if (inFlight) {
    return inFlight;
  }

  const run = async (): Promise<boolean> => {
    if (typeof navigator !== "undefined" && "locks" in navigator) {
      try {
        return await navigator.locks.request(LOCK_NAME, async () => performRefresh());
      } catch {
        return performRefresh();
      }
    }

    return performRefresh();
  };

  inFlight = run().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export function scheduleFromCookie(minDelaySeconds = 0): void {
  if (scheduledTimer !== null) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }

  const expiry = getAccessExpiryEpoch();
  if (expiry === null) {
    return;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const delayMs = Math.max(
    minDelaySeconds * 1000,
    (expiry - REFRESH_MARGIN_SECONDS - nowSeconds) * 1000,
  );

  scheduledTimer = setTimeout(() => {
    scheduledTimer = null;
    void triggerRefresh();
  }, Math.min(delayMs, 2_147_000_000));
}

export function listenForReschedules(): () => void {
  if (typeof BroadcastChannel === "undefined") {
    return () => {};
  }

  channel ??= new BroadcastChannel("playlog-session");
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === "session-refreshed") {
      scheduleFromCookie();
    }
  };
  channel.addEventListener("message", onMessage);

  return () => channel?.removeEventListener("message", onMessage);
}
