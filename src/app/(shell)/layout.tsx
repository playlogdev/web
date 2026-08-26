import { headers } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { SessionRefresher } from "@/components/session-refresher";
import { requireSession } from "@/lib/auth/session";
import { safeInternalPath } from "@/lib/validation";

/**
 * Application shell: fixed sidebar on desktop, sticky header + bottom nav on
 * mobile. The skip link is the first focusable element on every app page.
 *
 * Every render performs authoritative session verification (requireSession);
 * proxy.ts only did the optimistic cookie-presence gate.
 */
export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const nextPath = safeInternalPath(headerList.get("x-playlog-next"), "/home");
  await requireSession(nextPath);

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-fg-onbrand"
      >
        Skip to content
      </a>
      <AppSidebar />
      <div className="lg:pl-60">
        <MobileHeader />
        <main
          id="main-content"
          className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 lg:pb-12"
        >
          {children}
        </main>
      </div>
      <BottomNav />
      <SessionRefresher />
    </div>
  );
}
