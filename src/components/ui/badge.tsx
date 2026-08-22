import type { HTMLAttributes } from "react";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "success"
  | "info"
  | "warning"
  | "danger";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-edge bg-elevated text-fg-muted",
  brand: "border-brand/40 bg-brand/10 text-brand",
  success: "border-success/40 bg-success/10 text-success",
  info: "border-info/40 bg-info/10 text-info",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-danger/40 bg-danger/10 text-danger",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ tone = "neutral", className, ...rest }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5",
        "text-meta font-medium whitespace-nowrap",
        toneClasses[tone],
        className,
      ].join(" ")}
      {...rest}
    />
  );
}
