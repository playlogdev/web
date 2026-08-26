"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormStatus, rateLimitMessage } from "@/components/auth/form-status";

/**
 * The reset token arrives via the email link's query string and is consumed
 * server-side through the BFF. It is kept out of rendered output.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
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
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
        credentials: "same-origin",
      });

      if (response.ok) {
        router.push("/login?reset=1");
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

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="New password"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        hint="8-72 characters."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      {error && <FormStatus tone="error">{error}</FormStatus>}
      <Button type="submit" size="lg" loading={loading}>
        {loading ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
