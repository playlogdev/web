"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/components/auth/form-status";

/**
 * Logout controls. Current-session logout clears local cookies even when the
 * upstream call fails; the UI says whether upstream revocation actually
 * happened. Logout-all is strict: failure is surfaced, never disguised.
 */
export function LogoutButtons() {
  const router = useRouter();
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [currentError, setCurrentError] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  async function logoutCurrentSession() {
    setLoadingCurrent(true);
    setCurrentMessage(null);
    setCurrentError(false);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as
        | { upstream_revoked?: boolean }
        | null;

      if (response.ok && body?.upstream_revoked) {
        router.refresh();
        router.push("/");
        return;
      }

      if (response.ok) {
        // Cookies were cleared, but the API session could not be revoked —
        // say so instead of claiming a full logout.
        setCurrentError(true);
        setCurrentMessage(
          "Signed out on this device, but the server session could not be revoked. It will expire on its own.",
        );
        return;
      }

      setCurrentError(true);
      setCurrentMessage("Could not sign out. Try again.");
    } catch {
      setCurrentError(true);
      setCurrentMessage("Could not reach the server. Try again.");
    } finally {
      setLoadingCurrent(false);
    }
  }

  async function logoutAllSessions() {
    setLoadingAll(true);
    setAllError(null);

    try {
      const response = await fetch("/api/auth/logout/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        credentials: "same-origin",
      });

      if (response.ok) {
        router.refresh();
        router.push("/");
        return;
      }

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setAllError(body?.error ?? "Could not sign out everywhere. Try again.");
    } catch {
      setAllError("Could not reach the server. Try again.");
    } finally {
      setLoadingAll(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={logoutCurrentSession}
          loading={loadingCurrent}
          disabled={loadingCurrent || loadingAll}
        >
          Log out this device
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={logoutAllSessions}
          loading={loadingAll}
          disabled={loadingCurrent || loadingAll}
        >
          Log out everywhere
        </Button>
      </div>
      {currentMessage && <FormStatus tone={currentError ? "error" : "success"}>{currentMessage}</FormStatus>}
      {allError && <FormStatus tone="error">{allError}</FormStatus>}
    </div>
  );
}
