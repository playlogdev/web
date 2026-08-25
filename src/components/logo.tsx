import Link from "next/link";
import Image from "next/image";

type LogoProps = {
  href?: string;
  size?: "sm" | "md";
};

/**
 * Approved mark (public/brand/playlog-mark.svg, a byte-for-byte copy of
 * docs/brand/logos/playlog-mark.svg — docs/brand remains the source of
 * truth) composed with real Sora text. The mark is decorative because the
 * visible "Playlog" text already names the link. Aspect ratio is fixed by
 * the asset's own viewBox (500:631); width and height are set together so
 * it can never distort.
 */
const markSizes = {
  sm: { width: 16, height: 20 },
  md: { width: 19, height: 24 },
} as const;

export function Logo({ href = "/", size = "md" }: LogoProps) {
  const mark = markSizes[size];

  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2.5 font-bold tracking-tight text-fg",
        size === "sm" ? "text-lg" : "text-xl",
      ].join(" ")}
    >
      <Image
        src="/brand/playlog-mark.svg"
        alt=""
        width={mark.width}
        height={mark.height}
        unoptimized
        priority
        className="shrink-0"
      />
      Playlog
    </Link>
  );
}
