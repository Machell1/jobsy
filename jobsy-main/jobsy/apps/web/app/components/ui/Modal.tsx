"use client";

import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from "react";

/* ─── Types ───────────────────────────────────────────────── */

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  full: "max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] h-full",
} as const;

export type ModalSize = keyof typeof sizeStyles;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
}

/* ─── Close Icon ──────────────────────────────────────────── */

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/* ─── Component ───────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  size = "md",
  title,
  children,
  footer,
  closeOnBackdrop = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /* Lock body scroll & manage focus */
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";

      // Focus first focusable element inside the dialog
      requestAnimationFrame(() => {
        const focusable = dialogRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      });
    } else {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  /* Escape key */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }

      /* Focus trap */
      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={[
          "relative z-10 w-full rounded-lg bg-white shadow-xl",
          "animate-in fade-in zoom-in-95 duration-200",
          sizeStyles[size],
        ].join(" ")}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            <h2 className="text-lg font-semibold text-neutral-900 font-[family-name:var(--font-heading)]">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {/* Close button when no title */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer z-10"
            aria-label="Close dialog"
          >
            <CloseIcon />
          </button>
        )}

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
