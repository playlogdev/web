import type { ComponentType, SVGProps } from "react";
import {
  ActivityIcon,
  CompassIcon,
  HomeIcon,
  LibraryIcon,
  UserIcon,
} from "@/components/icons";

export type NavDestination = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

/** The five primary destinations; smaller than the brand board on purpose. */
export const navDestinations: readonly NavDestination[] = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/library", label: "Library", icon: LibraryIcon },
  { href: "/discover", label: "Discover", icon: CompassIcon },
  { href: "/activity", label: "Activity", icon: ActivityIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
] as const;
