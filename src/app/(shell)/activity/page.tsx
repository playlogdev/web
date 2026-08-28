import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActivityFeed } from "@/components/social/activity-feed";
import { ProfileLookupForm } from "@/components/social/profile-lookup-form";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { getFeed } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import type { FeedPage } from "@/lib/social";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login?next=%2Factivity");
  }

  let initialPage: FeedPage;
  try {
    initialPage = await getFeed(accessToken, undefined, 12);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/api/auth/expired?next=%2Factivity");
    }
    return <ActivityFailure />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-headline text-fg">Activity</h1>
        <p className="text-label text-fg-muted">Game journal updates from players you follow.</p>
      </header>
      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="text-title text-fg">Find a player</h2>
          <p className="text-meta text-fg-muted">Enter an exact username; user search is not available in the API yet.</p>
        </div>
        <ProfileLookupForm compact />
      </Card>
      <ActivityFeed initialPage={initialPage} />
    </div>
  );
}

function ActivityFailure() {
  return (
    <div className="flex flex-col gap-6">
      <header><h1 className="text-headline text-fg">Activity</h1></header>
      <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-5">
        <h2 className="text-title text-danger">Couldn&apos;t load your activity</h2>
        <p className="mt-2 text-label text-fg-muted">Try again in a moment. Your journal is safe.</p>
      </div>
    </div>
  );
}
