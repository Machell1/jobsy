import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

/* ─── Types ───────────────────────────────────────────────── */

const variantStyles = {
  default: "bg-white shadow-sm",
  elevated: "bg-white shadow-md",
  bordered: "bg-white border border-neutral-200",
  interactive:
    "bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer",
} as const;

export type CardVariant = keyof typeof variantStyles;

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  header?: ReactNode;
  footer?: ReactNode;
  noPadding?: boolean;
}

/* ─── Component ───────────────────────────────────────────── */

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      header,
      footer,
      noPadding = false,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={[
          "rounded-lg overflow-hidden",
          variantStyles[variant],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {header && (
          <div className="px-4 py-3 border-b border-neutral-100 sm:px-6">
            {header}
          </div>
        )}

        <div className={noPadding ? "" : "p-4 sm:p-6"}>{children}</div>

        {footer && (
          <div className="px-4 py-3 border-t border-neutral-100 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = "Card";
