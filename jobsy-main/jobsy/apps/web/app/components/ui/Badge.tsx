import { type HTMLAttributes, type ReactNode } from "react";

/* ─── Variant + Size Maps ─────────────────────────────────── */

const variantStyles = {
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  neutral: "bg-neutral-100 text-neutral-600 border-neutral-200",
} as const;

const dotColors = {
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-blue-500",
  neutral: "bg-neutral-400",
} as const;

const sizeStyles = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-0.5",
} as const;

/* ─── Types ───────────────────────────────────────────────── */

export type BadgeVariant = keyof typeof variantStyles;
export type BadgeSize = keyof typeof sizeStyles;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: ReactNode;
}

/* ─── Component ───────────────────────────────────────────── */

export function Badge({
  variant = "neutral",
  size = "md",
  dot = false,
  icon,
  children,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 font-medium rounded-full border",
        variantStyles[variant],
        sizeStyles[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {icon && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
