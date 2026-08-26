"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "@/components/icons";
import { normalizeSearchQuery } from "@/lib/games";

/**
 * URL-driven GET search form. Submission navigates to /discover?q=…, so the
 * Server Component owns the actual search; the only client behavior here is
 * the pending state while the navigation is in flight.
 */
export function SearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = normalizeSearchQuery(value);
    const destination = query
      ? `/discover?${new URLSearchParams({ q: query }).toString()}`
      : "/discover";

    startTransition(() => {
      router.push(destination);
    });
  }

  return (
    <form
      action="/discover"
      method="get"
      role="search"
      onSubmit={onSubmit}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <label htmlFor="game-search" className="sr-only">
        Search games by name
      </label>
      <input
        id="game-search"
        name="q"
        type="search"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        placeholder="Search games…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={pending}
        className="h-11 w-full flex-1 rounded-lg border border-edge bg-background px-4 text-base text-fg placeholder:text-fg-muted/70 transition-colors duration-150 hover:border-edge-strong disabled:opacity-50"
      />
      <Button type="submit" size="lg" loading={pending} className="sm:w-36">
        {pending ? (
          "Searching…"
        ) : (
          <>
            <SearchIcon width={16} height={16} />
            Search
          </>
        )}
      </Button>
    </form>
  );
}
