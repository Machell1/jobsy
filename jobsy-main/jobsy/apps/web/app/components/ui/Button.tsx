"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

/* ─── Variant + Size Maps ─────────────────────────────────── */

const variantStyles = {
  primary:
    "bg-brand-primary text-white hover:bg-blue-700 focus-visible:ring-brand-primary",
  secondary:
    "bg-brand-secondary text-white hover:bg-green-700 focus-visible:ring-brand-secondary",
  outline:
    "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 focus-visible:ring-brand-primary",
  ghost:
    "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-brand-primary",
  danger:
    "bg-error text-white hover:bg-red-700 focus-visible:ring-error",
} as const;

const sizeStyles = {
  sm: "h-9 min-w-[44px] px-3 text-sm gap-1.5",
  md: "h-11 min-w-[44px] px-4 text-sm gap-2",
  lg: "h-12 min-w-[44px] px-6 text-base gap-2.5",
} as const;

/* ─── Types ───────────────────────────────────────────────── */

export type ButtonVariant = keyof typeof variantStyles;
export type ButtonSize = keyof typeof sizeStyles;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

/* ─── Spinner ─────────────────────────────────────────────── */

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/* ─── Component ───────────────────────────────────────────── */

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      iconLeft,
      iconRight,
      fullWidth = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={[
          "inline-flex items-center justify-center font-medium rounded-lg transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "cursor-pointer select-none",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? "w-full" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {loading && <Spinner />}
        {!loading && iconLeft && (
          <span className="shrink-0" aria-hidden="true">
            {iconLeft}
          </span>
        )}
        {children && <span>{children}</span>}
        {!loading && iconRight && (
          <span className="shrink-0" aria-hidden="true">
            {iconRight}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
