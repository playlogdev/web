import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
};

export function Input({
  label,
  error,
  hint,
  id,
  className,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = [hint && `${inputId}-hint`, error && `${inputId}-error`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={inputId} className="text-label text-fg-muted">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId || undefined}
        className={[
          "h-10 w-full rounded-lg border bg-background px-3 text-base text-fg",
          "placeholder:text-fg-muted/70",
          "transition-colors duration-150 ease-out",
          "disabled:pointer-events-none disabled:opacity-50",
          error
            ? "border-danger hover:border-danger"
            : "border-edge hover:border-edge-strong",
          className,
        ].join(" ")}
        {...rest}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-meta text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-meta text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
