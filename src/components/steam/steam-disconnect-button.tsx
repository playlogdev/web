"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SteamDisconnectButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    if (!confirming) {
      setConfirming(true);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/connections/steam", {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (response.status === 401) {
        router.push(`/api/auth/expired?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!response.ok) {
        setError("Steam could not be disconnected. Try again.");
        return;
      }
      router.replace("/connections/steam");
      router.refresh();
    } catch {
      setError("Could not reach Playlog. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant={confirming ? "primary" : "ghost"} size="sm" loading={loading} onClick={disconnect}>
          {confirming ? "Confirm disconnect" : "Disconnect Steam"}
        </Button>
        {confirming && (
          <Button variant="ghost" size="sm" disabled={loading} onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        )}
      </div>
      {confirming && (
        <p className="text-meta text-fg-muted">
          This removes the imported Steam snapshot. Your Playlog journal entries stay intact.
        </p>
      )}
      {error && <p role="alert" className="text-label text-danger">{error}</p>}
    </div>
  );
}
