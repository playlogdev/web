"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormStatus, rateLimitMessage } from "@/components/auth/form-status";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "same-origin",
      });

      if (response.ok) {
        setSent(true);
        return;
      }

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        setError(rateLimitMessage(Number.isFinite(retryAfter) ? retryAfter : undefined));
        return;
      }

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Something went wrong. Try again.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <FormStatus tone="success">
        If an account exists for that address, a reset link is on its way. Check your inbox.
      </FormStatus>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      {error && <FormStatus tone="error">{error}</FormStatus>}
      <Button type="submit" size="lg" loading={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
