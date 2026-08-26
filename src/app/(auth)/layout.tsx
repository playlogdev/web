import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Sign in" };

/** Shared narrow centered layout for the authentication pages. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-edge">
        <div className="mx-auto flex h-16 w-full max-w-md items-center px-4">
          <Logo />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="border-t border-edge">
        <div className="mx-auto flex h-12 w-full max-w-md items-center justify-center">
          <p className="text-meta text-fg-muted">
            <Link href="/" className="hover:text-fg">
              Back to home
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
