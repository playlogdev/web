import Link from "next/link";
import { Logo } from "@/components/logo";

/** Not-found for invalid IDs and unknown games on the public detail route. */
export default function GameNotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-edge">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center px-4">
          <Logo href="/" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4 py-16">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <h1 className="text-headline text-fg">Game not found</h1>
          <p className="text-label text-fg-muted">
            This page does not exist, or the game is not in Playlog&apos;s catalog yet.
          </p>
          <Link href="/" className="mt-2 text-label font-medium text-brand hover:underline focus-visible:underline">
            Back to Playlog
          </Link>
        </div>
      </main>
      <footer className="border-t border-edge">
        <div className="mx-auto flex h-12 w-full max-w-4xl items-center justify-center">
          <p className="text-meta text-fg-muted">Playlog — Track. Rate. Remember.</p>
        </div>
      </footer>
    </div>
  );
}
