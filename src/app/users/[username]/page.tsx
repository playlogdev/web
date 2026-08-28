import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/social/follow-button";
import { PublicLibraryCard } from "@/components/social/public-library-card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LibraryIcon } from "@/components/icons";
import { ApiError } from "@/lib/api/errors";
import { getPublicProfile } from "@/lib/api/server";
import { getAccessToken } from "@/lib/auth/cookies";
import { isUsername, normalizeUsername } from "@/lib/social";

export const metadata: Metadata = { title: "Player profile" };

export default async function PublicProfilePage({ params }: PageProps<"/users/[username]">) {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(rawUsername);
  if (!isUsername(username) || username !== rawUsername) {
    notFound();
  }

  const accessToken = await getAccessToken();
  let result;
  try {
    result = await getPublicProfile(username, accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    return <ProfileFailure />;
  }

  const { profile, viewer } = result;
  const isOwnProfile = viewer === "authenticated" && profile.is_following === undefined;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-4 rounded-xl border border-edge bg-surface p-5 shadow-card sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-headline text-fg">@{profile.username}</h1>
            {isOwnProfile && <Badge tone="brand">Your journal</Badge>}
          </div>
          <p className="text-label text-fg-muted">A public Playlog game journal.</p>
          <nav aria-label={`${profile.username} connections`}>
            <ul className="flex flex-wrap gap-4 text-label">
              <li>
                <Link href={`/users/${profile.username}/followers`} className="text-fg hover:text-brand">
                  <strong>{profile.follower_count}</strong>{" "}<span className="text-fg-muted">followers</span>
                </Link>
              </li>
              <li>
                <Link href={`/users/${profile.username}/following`} className="text-fg hover:text-brand">
                  <strong>{profile.following_count}</strong>{" "}<span className="text-fg-muted">following</span>
                </Link>
              </li>
              <li><strong>{profile.library.length}</strong>{" "}<span className="text-fg-muted">games</span></li>
            </ul>
          </nav>
        </div>

        {typeof profile.is_following === "boolean" ? (
          <FollowButton username={profile.username} initialFollowing={profile.is_following} />
        ) : viewer === "anonymous" ? (
          <Link
            href={`/login?next=${encodeURIComponent(`/users/${profile.username}`)}`}
            className={buttonClasses("secondary", "sm")}
          >
            Log in to follow
          </Link>
        ) : null}
      </header>

      <section aria-labelledby="journal-heading" className="flex flex-col gap-4">
        <h2 id="journal-heading" className="text-title text-fg">Game journal</h2>
        {profile.library.length === 0 ? (
          <EmptyState
            icon={LibraryIcon}
            title="No games logged yet"
            description={`${profile.username}'s journal is still waiting for its first game.`}
          />
        ) : (
          <ul className="grid gap-4">
            {profile.library.map((entry, index) => (
              <PublicLibraryCard key={entry.id} entry={entry} priority={index === 0} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProfileFailure() {
  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-5 py-6">
      <h1 className="text-title text-danger">Couldn&apos;t load this profile</h1>
      <p className="mt-2 text-label text-fg-muted">Try again in a moment. No journal data was changed.</p>
    </div>
  );
}
