import type { ButtonHTMLAttributes } from "react";
import { SpinnerIcon } from "@/components/icons";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * Icon-only buttons have no visible text, so a human-readable accessible
   * name is required at the type level.
   */
  "aria-label": string;
  variant?: "secondary" | "ghost";
  loading?: boolean;
};

const variantClasses = {
  secondary:
    "border border-edge bg-surface text-fg hover:border-edge-strong hover:bg-elevated",
  ghost: "bg-transparent text-fg-muted hover:bg-surface hover:text-fg",
} as const;

export function IconButton({
  variant = "ghost",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading ? true : undefined}
      aria-busy={loading || undefined}
      className={[
        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
        "transition-colors duration-150 ease-out",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? <SpinnerIcon /> : children}
    </button>
  );
}
