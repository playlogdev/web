"use client";

import { useEffect } from "react";
import { listenForReschedules, scheduleFromCookie } from "@/lib/auth/client-session";

/**
 * Mounted once inside the protected shell. Schedules a token refresh
 * shortly before the access token expires (based on the non-secret expiry
 * cookie) and reschedules when another tab refreshes. Renders nothing.
 */
export function SessionRefresher() {
  useEffect(() => {
    scheduleFromCookie();
    const unsubscribe = listenForReschedules();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        scheduleFromCookie();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
