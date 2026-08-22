import { Logo } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { navDestinations } from "@/lib/navigation";

/**
 * Desktop sidebar. Rendered on the server; only NavLink is a client island
 * because the active state depends on usePathname.
 */
export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-edge bg-surface px-3 py-5 lg:flex">
      <div className="px-2 pb-6">
        <Logo href="/home" />
      </div>
      <nav aria-label="Primary">
        <ul className="flex flex-col gap-1">
          {navDestinations.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <NavLink
                href={href}
                label={label}
                icon={<Icon />}
                className="w-full"
              />
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-auto px-2 text-meta text-fg-muted">
        Design preview — Playlog is in development.
      </p>
    </aside>
  );
}
