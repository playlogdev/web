"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavLinkProps = {
  href: string;
  label: string;
  /** Pre-rendered <Icon /> element so this stays the only client island in the shell. */
  icon: ReactNode;
  /** Mobile bottom bar shows icons only; the sidebar shows icon + label. */
  showLabel?: boolean;
  className?: string;
};

export function NavLink({
  href,
  label,
  icon,
  showLabel = true,
  className,
}: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={showLabel ? undefined : label}
      className={[
        "flex items-center rounded-lg transition-colors duration-150 ease-out",
        showLabel ? "gap-3 px-3 py-2 text-label" : "flex-col gap-1 px-2 py-1.5",
        active
          ? "bg-brand/10 text-brand"
          : "text-fg-muted hover:bg-surface hover:text-fg",
        className,
      ].join(" ")}
    >
      {icon}
      <span className={showLabel ? "" : "text-[0.6875rem] leading-none"}>
        {label}
      </span>
    </Link>
  );
}
