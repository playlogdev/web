import { Logo } from "@/components/logo";

/** Route-level loading state for dynamic navigation to a game detail page. */
export default function GameDetailLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-edge">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center px-4">
          <Logo href="/" />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8" aria-busy="true" aria-live="polite">
        <p className="sr-only">Loading game details…</p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="w-[132px] shrink-0 animate-pulse rounded-lg bg-elevated sm:w-[158px]" style={{ aspectRatio: "132 / 187" }} />
          <div className="flex flex-1 flex-col gap-3 py-1">
            <div className="h-8 w-3/4 animate-pulse rounded bg-elevated" />
            <div className="h-4 w-1/4 animate-pulse rounded bg-elevated" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-elevated" />
          </div>
        </div>
        <div className="h-24 animate-pulse rounded-xl bg-elevated" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-elevated" />
          ))}
        </div>
      </div>
    </div>
  );
}
