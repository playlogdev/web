import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /** Fixed set of shapes keeps skeleton layouts consistent. */
  shape?: "line" | "block" | "circle";
};

const shapeClasses = {
  line: "h-4 rounded-md",
  block: "h-24 rounded-xl",
  circle: "size-10 rounded-full",
} as const;

export function Skeleton({ shape = "line", className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={[
        "animate-pulse bg-elevated",
        shapeClasses[shape],
        className,
      ].join(" ")}
      {...rest}
    />
  );
}
