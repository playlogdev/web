"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function FollowButton({
  username,
  initialFollowing,
}: {
  username: string;
  initialFollowing: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (loading) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(username)}/follow`,
        { method: following ? "DELETE" : "POST", credentials: "same-origin" },
      );
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        if (response.status === 409) {
          setFollowing(true);
          router.refresh();
          return;
        }
        const retryAfter = Number(response.headers.get("Retry-After"));
        setError(
          response.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0
            ? `Try again in ${Math.ceil(retryAfter)} seconds.`
            : body?.error ?? "Could not update this follow.",
        );
        return;
      }
      setFollowing((value) => !value);
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={following ? "secondary" : "primary"}
        size="sm"
        loading={loading}
        onClick={toggle}
        aria-pressed={following}
      >
        {loading ? "Updating…" : following ? "Following" : "Follow"}
      </Button>
      {error && <p role="alert" className="max-w-56 text-meta text-danger">{error}</p>}
    </div>
  );
}
