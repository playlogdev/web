import Link from "next/link";

type LogoProps = {
  href?: string;
  /** "full" renders the wordmark; "mark" reserves space for a future icon. */
  size?: "sm" | "md";
};

/**
 * Temporary text-based wordmark. The brand board's logo must not be cropped
 * from the JPG; a proper SVG logo system replaces this component later.
 */
export function Logo({ href = "/", size = "md" }: LogoProps) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center font-bold tracking-tight text-fg",
        size === "sm" ? "text-lg" : "text-xl",
      ].join(" ")}
    >
      Play<span className="text-brand">log</span>
    </Link>
  );
}
