"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ConnectionIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  parseSteamConnection,
  parseSteamSyncJob,
  STEAM_CONNECT_TIMEOUT_MS,
  STEAM_POLL_INTERVAL_MS,
} from "@/lib/steam";

type Phase = "idle" | "starting" | "waiting" | "finishing";

export function SteamConnectCard() {
  const pathname = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    controllerRef.current?.abort();
    if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
  }, []);

  async function connect() {
    if (phase !== "idle") return;

    setError(null);
    const popup = window.open(
      "about:blank",
      "playlog-steam-connect",
      "popup,width=720,height=760,resizable=yes,scrollbars=yes",
    );
    if (!popup) {
      setError("Your browser blocked the Steam window. Allow popups for Playlog and try again.");
      return;
    }
    popup.opener = null;
    popup.document.title = "Connecting Steam to Playlog";
    popup.document.body.textContent = "Preparing Steam…";
    popupRef.current = popup;

    const controller = new AbortController();
    controllerRef.current = controller;
    setPhase("starting");

    try {
      const response = await fetch("/api/connections/steam/start", {
        method: "POST",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (response.status === 401) {
        popup.close();
        router.push(`/api/auth/expired?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!response.ok) {
        popup.close();
        setError(await responseMessage(response, "Steam connection could not be started."));
        setPhase("idle");
        return;
      }

      const body = (await response.json()) as { authorization_url?: unknown };
      if (typeof body.authorization_url !== "string" || !isSteamLoginURL(body.authorization_url)) {
        popup.close();
        setError("Playlog received an invalid Steam authorization address.");
        setPhase("idle");
        return;
      }

      popup.location.replace(body.authorization_url);
      setPhase("waiting");
      await pollForConnection(0, popup, controller);
    } catch (caught) {
      popup.close();
      if (!(caught instanceof DOMException && caught.name === "AbortError")) {
        setError("Could not reach Playlog. Check your connection and try again.");
        setPhase("idle");
      }
    }
  }

  async function pollForConnection(
    attempt: number,
    popup: Window,
    controller: AbortController,
  ): Promise<void> {
    const maxAttempts = Math.ceil(STEAM_CONNECT_TIMEOUT_MS / STEAM_POLL_INTERVAL_MS);
    if (attempt >= maxAttempts) {
      popup.close();
      setError("Steam connection timed out. Start again when you are ready.");
      setPhase("idle");
      return;
    }

    const response = await fetch("/api/connections/steam", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.status === 401) {
      popup.close();
      router.push(`/api/auth/expired?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (response.ok) {
      const connection = parseSteamConnection(await response.json());
      if (connection?.connected) {
        setPhase("finishing");
        popup.close();
        await recoverSyncJob(controller);
        return;
      }
    }

    if (popup.closed) {
      setError("The Steam window was closed before the connection completed.");
      setPhase("idle");
      return;
    }

    await new Promise<void>((resolve) => {
      timerRef.current = setTimeout(resolve, STEAM_POLL_INTERVAL_MS);
    });
    if (!controller.signal.aborted) {
      await pollForConnection(attempt + 1, popup, controller);
    }
  }

  async function recoverSyncJob(controller: AbortController) {
    const response = await fetch("/api/connections/steam/sync", {
      method: "POST",
      credentials: "same-origin",
      signal: controller.signal,
    });
    if (response.status === 401) {
      router.push(`/api/auth/expired?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!response.ok) {
      setError(await responseMessage(response, "Steam connected, but its first sync could not be opened."));
      setPhase("idle");
      router.refresh();
      return;
    }

    const job = parseSteamSyncJob(await response.json());
    if (job === null) {
      setError("Steam connected, but Playlog received an invalid sync response.");
      setPhase("idle");
      router.refresh();
      return;
    }
    router.replace(`/connections/steam?job=${encodeURIComponent(job.id)}`);
    router.refresh();
  }

  return (
    <Card emphasis="raised" className="flex flex-col gap-5 p-6">
      <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <ConnectionIcon width={24} height={24} />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-title text-fg">Connect your Steam library</h2>
        <p className="text-label text-fg-muted">
          Link Steam to import a read-only snapshot of games your account owns. Ownership never adds a game to your Playlog journal automatically.
        </p>
      </div>
      <div className="rounded-lg border border-info/30 bg-info/10 p-4 text-meta text-fg-muted">
        Steam currently returns to a Playlog API page that may briefly show raw JSON. Keep the window open; this page detects the connection and closes it automatically.
      </div>
      {error && <p role="alert" className="text-label text-danger">{friendlySteamError(error)}</p>}
      <Button onClick={connect} loading={phase !== "idle"} className="self-start">
        {phase === "starting"
          ? "Preparing Steam…"
          : phase === "waiting"
            ? "Waiting for Steam…"
            : phase === "finishing"
              ? "Opening your library…"
              : "Connect Steam"}
      </Button>
      <p className="text-meta text-fg-muted">
        This connects a library source only. You will continue signing in to Playlog with your Playlog email and password.
      </p>
    </Card>
  );
}

function isSteamLoginURL(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "steamcommunity.com" && url.pathname === "/openid/login";
  } catch {
    return false;
  }
}

async function responseMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

function friendlySteamError(message: string) {
  if (message.includes("not configured") || message.includes("unavailable")) {
    return "Steam integration is not configured for this Playlog environment yet.";
  }
  if (message.includes("too many requests")) {
    return "Too many Steam requests. Wait a minute and try again.";
  }
  return message;
}
