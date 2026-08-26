"use client";

import { useState } from "react";
import Image from "next/image";
import { isSafeCoverUrl, type Game } from "@/lib/games";

/**
 * IGDB's cover_big images are 264x374 (roughly 19:27). A missing, unsafe, or
 * broken cover renders a designed local fallback instead of substitute
 * artwork. Fixed dimensions prevent layout shift.
 */
export const COVER_WIDTH = 132;
export const COVER_HEIGHT = 187;

export function GameCover({ game, priority = false }: { game: Pick<Game, "name" | "cover_url">; priority?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (!failed && game.cover_url && isSafeCoverUrl(game.cover_url)) {
    return (
      <Image
        src={game.cover_url}
        alt={`Cover art for ${game.name}`}
        width={COVER_WIDTH * 2}
        height={COVER_HEIGHT * 2}
        priority={priority}
        onError={() => setFailed(true)}
        className="h-full w-full rounded-lg object-cover"
      />
    );
  }

  return (
    <div
      aria-hidden
      className="flex h-full w-full items-center justify-center rounded-lg border border-edge bg-elevated p-2 text-center"
    >
      <span className="line-clamp-3 text-meta text-fg-muted">{game.name}</span>
    </div>
  );
}
