"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormStatus, rateLimitMessage } from "@/components/auth/form-status";
import { safeInternalPath } from "@/lib/validation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeInternalPath(searchParams.get("next"), "/home");

  const [email, setEmail] = useState("");
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "same-origin",
      });

      if (response.ok) {
        // Session cookies are now set; refresh server components and move to
        // the validated internal destination.
        router.refresh();
        router.push(nextPath);
        return;
      }

      const body = (await response.json().catch(() => null)) as { error?: string; } | null;
      const message = body?.error ?? "Something went wrong. Try again.";

      if (response.status === 403 && message.toLowerCase().includes("not verified")) {
        const params = new URLSearchParams();
        if (email) {
          params.set("email", email);
        }
        router.push(`/verify-email?${params.toString()}`);
        return;
      }

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        setError(rateLimitMessage(Number.isFinite(retryAfter) ? retryAfter : undefined));
        return;
      }

      setError(message);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
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
      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      {error && <FormStatus tone="error">{error}</FormStatus>}
      <Button type="submit" size="lg" loading={loading}>
        {loading ? "Signing in…" : "Log in"}
      </Button>
    </form>
  );
}
