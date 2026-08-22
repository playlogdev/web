import type { Metadata } from "next";
import { UserIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Profile" };

/**
 * Demonstrates the shell's profile/settings destination. The rows are inert;
 * real settings behavior arrives with authentication (milestone 3) and the
 * API contract's capabilities (see docs/api-gaps.md — no profile editing yet).
 */
export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-headline text-fg">Profile</h1>
          <Badge tone="brand">Design preview</Badge>
        </div>
        <p className="text-label text-fg-muted">
          Your public journal and account settings.
        </p>
      </header>

      <EmptyState
        icon={UserIcon}
        title="No profile yet"
        description="Sign in to create your journal and get a public profile page with your library."
      />

      <Card className="flex flex-col gap-1">
        <h2 className="text-title text-fg">Settings</h2>
        <p className="text-meta text-fg-muted">
          Account, sessions, and Steam connection will live here in later
          milestones.
        </p>
        <div className="mt-2 flex flex-col divide-y divide-edge">
          <div className="flex items-center justify-between py-3">
            <span className="text-label text-fg">Account</span>
            <Button variant="ghost" size="sm" disabled>
              Milestone 3
            </Button>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-label text-fg">Steam connection</span>
            <Button variant="ghost" size="sm" disabled>
              Milestone 7
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
