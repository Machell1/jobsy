import { type ReactNode } from "react";
import { Button, type ButtonProps } from "./Button";

/* ─── Types ───────────────────────────────────────────────── */

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps["variant"];
  };
  className?: string;
}

/* ─── Component ───────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      {icon && (
        <div className="mb-4 text-neutral-300" aria-hidden="true">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-neutral-900 font-[family-name:var(--font-heading)]">
        {title}
      </h3>

      {description && (
        <p className="mt-2 text-sm text-neutral-500 max-w-sm">{description}</p>
      )}

      {/* Zero dead ends: every empty state must have an action */}
      {action && (
        <div className="mt-6">
          <Button
            variant={action.variant ?? "primary"}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
