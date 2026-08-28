"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  parseSteamSyncJob,
  STEAM_POLL_INTERVAL_MS,
  STEAM_SYNC_MAX_POLL_ATTEMPTS,
  type SteamSyncJob,
  type SteamSyncStatus,
} from "@/lib/steam";

const STATUS_TONES: Record<SteamSyncStatus, BadgeTone> = {
  queued: "neutral",
  running: "info",
  completed: "success",
  failed: "danger",
};

export function SteamSyncPanel({ initialJob }: { initialJob: SteamSyncJob | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollAttempt, setPollAttempt] = useState(0);

  useEffect(() => {
    if (!job || (job.status !== "queued" && job.status !== "running")) {
      return;
    }
    if (pollAttempt >= STEAM_SYNC_MAX_POLL_ATTEMPTS) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/connections/steam/sync/${encodeURIComponent(job.id)}`,
          { credentials: "same-origin", cache: "no-store", signal: controller.signal },
        );
        if (response.status === 401) {
          router.push(`/api/auth/expired?next=${encodeURIComponent(pathname)}`);
          return;
        }
        if (!response.ok) {
          setError("Sync progress could not be refreshed. You can try again.");
          setPollAttempt((attempt) => attempt + 1);
          return;
        }
        const nextJob = parseSteamSyncJob(await response.json());
        if (nextJob === null) {
          setError("Playlog received an invalid Steam sync response.");
          setPollAttempt((attempt) => attempt + 1);
          return;
        }
        setError(null);
        setJob(nextJob);
        if (nextJob.status === "completed" || nextJob.status === "failed") {
          router.refresh();
        } else {
          setPollAttempt((attempt) => attempt + 1);
        }
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError("Could not reach Playlog while checking Steam sync progress.");
          setPollAttempt((attempt) => attempt + 1);
        }
      }
    }, STEAM_POLL_INTERVAL_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [job, pathname, pollAttempt, router]);

  async function startSync() {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/connections/steam/sync", {
        method: "POST",
        credentials: "same-origin",
      });
      if (response.status === 401) {
        router.push(`/api/auth/expired?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(syncErrorMessage(response.status, body?.error));
        return;
      }
      const nextJob = parseSteamSyncJob(await response.json());
      if (nextJob === null) {
        setError("Playlog received an invalid Steam sync response.");
        return;
      }
      setJob(nextJob);
      setPollAttempt(0);
      router.replace(`/connections/steam?job=${encodeURIComponent(nextJob.id)}`);
    } catch {
      setError("Could not reach Playlog. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  const active = job?.status === "queued" || job?.status === "running";
  const timedOut = active && pollAttempt >= STEAM_SYNC_MAX_POLL_ATTEMPTS;
  const polling = active && !timedOut;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-title text-fg">Library synchronization</h2>
          <p className="mt-1 text-meta text-fg-muted">
            Refreshes owned games and IGDB matches. It does not create Playlog journal entries.
          </p>
        </div>
        {job && <Badge tone={STATUS_TONES[job.status]}>{statusLabel(job.status)}</Badge>}
      </div>

      {polling && (
        <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-lg bg-info/10 p-4 text-label text-info">
          <span className="size-2 animate-pulse rounded-full bg-info" aria-hidden />
          {job.status === "queued" ? "Sync is queued…" : "Steam library is syncing…"}
        </div>
      )}

      {job?.status === "completed" && (
        <dl className="grid grid-cols-3 gap-3">
          <SyncCount label="Total" value={job.total_count} />
          <SyncCount label="Matched" value={job.matched_count} />
          <SyncCount label="Unmatched" value={job.unmatched_count} />
        </dl>
      )}

      {job?.status === "failed" && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-label text-danger">
          Steam library sync failed. Make your Steam game details public, check the integration configuration, and try again.
        </p>
      )}
      {timedOut && (
        <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-label text-warning">
          Sync is taking longer than expected. Check the active job again when you are ready.
        </p>
      )}
      {error && <p role="alert" className="text-label text-danger">{error}</p>}

      <Button
        variant="secondary"
        size="sm"
        loading={starting || polling}
        disabled={polling}
        onClick={startSync}
        className="self-start"
      >
        {polling ? "Sync in progress…" : timedOut ? "Check sync again" : "Sync Steam library"}
      </Button>
    </Card>
  );
}

function SyncCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-edge bg-background px-3 py-3">
      <dt className="text-meta text-fg-muted">{label}</dt>
      <dd className="mt-1 text-title text-fg">{value}</dd>
    </div>
  );
}

function statusLabel(status: SteamSyncStatus) {
  return status === "queued"
    ? "Queued"
    : status === "running"
      ? "Syncing"
      : status === "completed"
        ? "Completed"
        : "Failed";
}

function syncErrorMessage(status: number, message?: string) {
  if (status === 429) return "Too many sync requests. Wait a minute and try again.";
  if (status === 409) return "Steam is no longer connected. Refresh this page.";
  if (status === 503 || message?.includes("unavailable")) {
    return "Steam synchronization is not configured for this Playlog environment yet.";
  }
  return message ?? "Steam sync could not be started.";
}
