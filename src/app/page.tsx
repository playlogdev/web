import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import {
  BookmarkIcon,
  LibraryIcon,
  StarIcon,
} from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Playlog — Track. Rate. Remember.",
};

const features = [
  {
    icon: BookmarkIcon,
    title: "Track what you play",
    description:
      "Log every game you finish, quit, or queue up — a quiet record of your playing life.",
  },
  {
    icon: StarIcon,
    title: "Rate and remember",
    description:
      "Score games out of five and keep short notes, so the experiences don't blur together.",
  },
  {
    icon: LibraryIcon,
    title: "Discover and organize",
    description:
      "Search games, build your library, and follow friends to see what they're playing.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-edge bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Account" className="flex items-center gap-2">
            <Link href="/login" className={buttonClasses("ghost", "md")}>
              Log in
            </Link>
            <Link href="/signup" className={buttonClasses("primary", "md")}>
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="text-label text-fg-muted">A personal game journal</p>
          {/* The multicolor gradient appears here and nowhere else: one
             sparing marketing accent, per the brand rules. */}
          <h1 className="mt-4 text-display-sm bg-gradient-to-r from-brand via-accent-teal to-accent-blue bg-clip-text text-transparent md:text-display-lg">
            Track. Rate. Remember.
          </h1>
          <p className="mt-6 max-w-xl text-base text-fg-muted sm:text-lg">
            Playlog is a quiet journal for the games you play. Keep a record of
            every run, rate what mattered, and look back on the stories worth
            remembering.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/signup"
              className={buttonClasses("primary", "lg")}
            >
              Create your journal
            </Link>
            <Link href="/login" className={buttonClasses("secondary", "lg")}>
              Log in
            </Link>
          </div>
          <p className="mt-4 text-meta text-fg-muted">
            Accounts open with milestone 3 — these routes are on the way.
          </p>
        </section>

        <section
          aria-labelledby="features-heading"
          className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6"
        >
          <h2 id="features-heading" className="sr-only">
            What Playlog does
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="flex flex-col gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Icon />
                </span>
                <h3 className="text-title text-fg">{title}</h3>
                <p className="text-label text-fg-muted">{description}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-edge">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo size="sm" href="/" />
          <p className="text-meta text-fg-muted">
            Playlog is in development. © {new Date().getFullYear()} Playlog.
          </p>
        </div>
      </footer>
    </div>
  );
}
