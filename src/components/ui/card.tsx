import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** "flat" blends into the page; "raised" adds elevation for emphasis. */
  emphasis?: "flat" | "raised";
};

export function Card({
  emphasis = "flat",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-edge bg-surface p-5 shadow-card",
        emphasis === "raised" ? "shadow-raised" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
