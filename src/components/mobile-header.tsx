import { Logo } from "@/components/logo";

/** Compact mobile header; primary navigation lives in the bottom bar. */
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-edge bg-background/90 backdrop-blur lg:hidden">
      <div className="flex h-14 items-center px-4">
        <Logo href="/home" size="sm" />
      </div>
    </header>
  );
}
