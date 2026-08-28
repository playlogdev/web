import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectionList } from "@/components/social/connection-list";
import { ApiError } from "@/lib/api/errors";
import { getFollowing } from "@/lib/api/server";
import { isUsername, normalizeUsername } from "@/lib/social";

export const metadata: Metadata = { title: "Following" };

export default async function FollowingPage({ params }: PageProps<"/users/[username]/following">) {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(rawUsername);
  if (!isUsername(username) || username !== rawUsername) {
    notFound();
  }

  let following: string[];
  try {
    following = await getFollowing(username);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    return <ListFailure />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link href={`/users/${username}`} className="text-label text-brand hover:underline">← @{username}</Link>
        <h1 className="text-headline text-fg">Following</h1>
        <p className="text-label text-fg-muted">{following.length} {following.length === 1 ? "player" : "players"}</p>
      </header>
      <ConnectionList
        usernames={following}
        emptyTitle="Not following anyone yet"
        emptyDescription={`${username} is not following any players yet.`}
      />
      <p className="text-meta text-fg-muted">This list is complete and newest first; the current API does not paginate follow lists.</p>
    </div>
  );
}

function ListFailure() {
  return <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-5 text-label text-danger">This follow list could not be loaded. Try again.</p>;
}
