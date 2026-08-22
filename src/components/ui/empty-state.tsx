import type { ComponentType, ReactNode, SVGProps } from "react";

type EmptyStateProps = {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-edge bg-surface/50 px-6 py-12 text-center">
      {Icon && <Icon width={28} height={28} className="text-fg-muted" />}
      <p className="text-title text-fg">{title}</p>
      {description && (
        <p className="max-w-sm text-label text-fg-muted">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
