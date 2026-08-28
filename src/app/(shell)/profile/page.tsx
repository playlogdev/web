import type { Metadata } from "next";
import { headers } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FormStatus } from "@/components/auth/form-status";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { LogoutButtons } from "@/components/auth/logout-buttons";
import { ProfileLookupForm } from "@/components/social/profile-lookup-form";
import { getAccessToken } from "@/lib/auth/cookies";
import { requireSession } from "@/lib/auth/session";
import { listSessions, type SessionSummary } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import { safeInternalPath } from "@/lib/validation";

export const metadata: Metadata = { title: "Profile" };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ProfilePage() {
  const headerList = await headers();
  const nextPath = safeInternalPath(headerList.get("x-playlog-next"), "/profile");
  const session = await requireSession(nextPath);

  const accessToken = await getAccessToken();
  let sessions: SessionSummary[] | null = null;
  let sessionsError: string | null = null;

  if (accessToken) {
    try {
      const { body } = await listSessions(accessToken);
      sessions = body.sessions;
    } catch (error) {
      sessionsError =
        error instanceof ApiError && error.status === 401
          ? "Your session expired. Reload the page to continue."
          : "Sessions could not be loaded. Try again in a moment.";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-headline text-fg">Profile</h1>
        <p className="text-label text-fg-muted">
          Your public journal and account settings.
        </p>
      </header>

      <Card className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h2 className="text-title text-fg">Account</h2>
          <Badge tone={session.verified ? "success" : "warning"}>
            {session.verified ? "Email verified" : "Email not verified"}
          </Badge>
        </div>
        <p className="text-label text-fg-muted">{session.email}</p>
        <p className="text-meta text-fg-muted">
          The current account response does not include your username, so Playlog cannot link your own public journal automatically yet.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="text-title text-fg">Public journal</h2>
          <p className="text-meta text-fg-muted">
            Open any public profile with its exact username. Profile editing and user search are not available in the API yet.
          </p>
        </div>
        <ProfileLookupForm compact />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-title text-fg">Password</h2>
        <ChangePasswordForm />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-title text-fg">Active sessions</h2>
        {sessionsError && <FormStatus tone="error">{sessionsError}</FormStatus>}
        {sessions && (
          <ul className="flex flex-col divide-y divide-edge">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-label text-fg">
                    Session started {formatDateTime(s.created_at)}
                  </span>
                  <span className="text-meta text-fg-muted">
                    Expires {formatDateTime(s.expires_at)}
                  </span>
                </div>
                {s.current && <Badge tone="brand">This device</Badge>}
              </li>
            ))}
          </ul>
        )}
        <p className="text-meta text-fg-muted">
          The API currently cannot revoke a single other session; use
          &quot;Log out everywhere&quot; to revoke all of them.
        </p>
        <LogoutButtons />
      </Card>
    </div>
  );
}
