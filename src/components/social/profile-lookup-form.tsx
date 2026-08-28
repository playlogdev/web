"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isUsername, normalizeUsername } from "@/lib/social";

export function ProfileLookupForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | undefined>();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeUsername(username);
    if (!isUsername(normalized)) {
      setError("Enter a username with 3–30 lowercase letters, numbers, or underscores.");
      return;
    }
    setError(undefined);
    router.push(`/users/${encodeURIComponent(normalized)}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={compact ? "flex flex-col gap-3 sm:flex-row sm:items-end" : "flex flex-col gap-3"}
      noValidate
    >
      <Input
        label="Exact username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        error={error}
        placeholder="player_name"
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit" variant="secondary" className={compact ? "sm:shrink-0" : undefined}>
        View profile
      </Button>
    </form>
  );
}
