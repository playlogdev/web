"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormStatus, rateLimitMessage } from "@/components/auth/form-status";

/** Resend-verification trigger. The upstream is enumeration-safe by design. */
export function ResendVerification({ email }: { email?: string }) {
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onResend() {
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/verify/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "same-origin",
      });

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        setState("error");
        setMessage(rateLimitMessage(Number.isFinite(retryAfter) ? retryAfter : undefined));
        return;
      }

      if (response.ok) {
        setState("sent");
        setMessage("If the address is registered and unverified, a new link has been sent.");
        return;
      }

      setState("error");
      setMessage("Could not send the email. Try again in a moment.");
    } catch {
      setState("error");
      setMessage("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" onClick={onResend} loading={loading} disabled={loading}>
        {loading ? "Sending…" : "Resend verification email"}
      </Button>
      {message && (
        <FormStatus tone={state === "error" ? "error" : "success"}>{message}</FormStatus>
      )}
    </div>
  );
}
