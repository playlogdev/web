import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";
import { getOptionalSession } from "@/lib/auth/session";

export default async function PublicProfileLayout({ children }: LayoutProps<"/users/[username]">) {
  const session = await getOptionalSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-fg-onbrand"
      >
        Skip to content
      </a>
      <header className="border-b border-edge bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Account" className="flex items-center gap-2">
            {session ? (
              <Link href="/home" className={buttonClasses("secondary", "sm")}>Open app</Link>
            ) : (
              <>
                <Link href="/login" className={buttonClasses("ghost", "sm")}>Log in</Link>
                <Link href="/signup" className={buttonClasses("primary", "sm")}>Sign up</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
