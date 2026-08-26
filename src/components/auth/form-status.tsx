"use client";

import type { ReactNode } from "react";

/** Accessible status/error announcement area for async forms. */
export function FormStatus({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`text-label ${tone === "error" ? "text-danger" : "text-success"}`}
    >
      {children}
    </p>
  );
}

export function rateLimitMessage(retryAfter?: number): string {
  return retryAfter && retryAfter > 0
    ? `Too many attempts. Try again in ${retryAfter} second${retryAfter === 1 ? "" : "s"}.`
    : "Too many attempts. Please wait a minute and try again.";
}
