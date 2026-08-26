"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormStatus, rateLimitMessage } from "@/components/auth/form-status";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }

    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        credentials: "same-origin",
      });

      if (response.ok) {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
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
        label="Current password"
        type="password"
        name="current-password"
        autoComplete="current-password"
        required
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        disabled={loading}
      />
      <Input
        label="New password"
        type="password"
        name="new-password"
        autoComplete="new-password"
        required
        hint="8-72 characters. Other sessions stay signed in; this device keeps its session."
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        disabled={loading}
      />
      {error && <FormStatus tone="error">{error}</FormStatus>}
      {success && (
        <FormStatus tone="success">Password changed. Other sessions were signed out.</FormStatus>
      )}
      <Button type="submit" variant="secondary" size="sm" loading={loading} disabled={loading}>
        {loading ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}
