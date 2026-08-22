import { NavLink } from "@/components/nav-link";
import { navDestinations } from "@/lib/navigation";

/** Mobile bottom navigation. Icons carry labels underneath, so no toggle state is needed. */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-edge bg-surface/95 backdrop-blur lg:hidden"
    >
      <ul
        className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        {navDestinations.map(({ href, label, icon: Icon }) => (
          <li key={href} className="flex-1">
            <NavLink
              href={href}
              label={label}
              icon={<Icon className="mx-auto" />}
              showLabel={false}
              className="w-full"
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
