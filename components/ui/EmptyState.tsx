import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-cream-200 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-wood-500" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="font-display text-lg text-wood-800">{title}</h3>
      {description && (
        <p className="text-sm text-wood-600 mt-1.5 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}