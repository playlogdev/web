import type { ButtonHTMLAttributes } from "react";
import { SpinnerIcon } from "@/components/icons";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-fg-onbrand shadow-card hover:bg-brand-hover active:translate-y-px",
  secondary:
    "border border-edge bg-surface text-fg hover:border-edge-strong hover:bg-elevated active:translate-y-px",
  ghost:
    "bg-transparent text-fg-muted hover:bg-surface hover:text-fg active:bg-elevated",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-label",
  md: "h-10 gap-2 rounded-lg px-4 text-label",
  lg: "h-12 gap-2 rounded-lg px-6 text-base",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
): string {
  return [
    "inline-flex select-none items-center justify-center font-medium",
    "transition-colors duration-150 ease-out",
    "disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
  ].join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      // aria-disabled rather than disabled while loading so the control
      // stays focusable and assistive tech can discover why nothing happened.
      disabled={disabled || loading ? true : undefined}
      aria-busy={loading || undefined}
      className={[buttonClasses(variant, size), className].join(" ")}
      {...rest}
    >
      {loading && <SpinnerIcon width={16} height={16} />}
      {children}
    </button>
  );
}
