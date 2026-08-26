"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormStatus, rateLimitMessage } from "@/components/auth/form-status";

export function SignupForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
        credentials: "same-origin",
      });

      if (response.status === 201) {
        // Registration does not sign the user in (the API returns no tokens);
        // guide them to the verification flow.
        const params = new URLSearchParams({ email: email.trim().toLowerCase() });
        router.push(`/verify-email?${params.toString()}`);
        return;
      }

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      const message = body?.error ?? "Something went wrong. Try again.";

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
        label="Username"
        name="username"
        autoComplete="username"
        required
        hint="3-30 characters: lowercase letters, numbers, underscores."
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={loading}
      />
      <Input
        label="Password"
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
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
