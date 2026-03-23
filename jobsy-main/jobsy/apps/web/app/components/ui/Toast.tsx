"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";

/* ─── Types ───────────────────────────────────────────────── */

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

/* ─── Variant Styles ──────────────────────────────────────── */

const variantStyles: Record<ToastVariant, string> = {
  success: "border-l-4 border-l-success bg-white",
  error: "border-l-4 border-l-error bg-white",
  warning: "border-l-4 border-l-warning bg-white",
  info: "border-l-4 border-l-brand-primary bg-white",
};

const iconPaths: Record<ToastVariant, string> = {
  success: "M20 6 9 17l-5-5",
  error: "M18 6 6 18M6 6l12 12",
  warning: "M12 9v4m0 4h.01M12 2L2 22h20L12 2z",
  info: "M12 16v-4m0-4h.01M22 12a10 10 0 11-20 0 10 10 0 0120 0z",
};

const iconColors: Record<ToastVariant, string> = {
  success: "text-success",
  error: "text-error",
  warning: "text-warning",
  info: "text-brand-primary",
};

/* ─── Context ─────────────────────────────────────────────── */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

/* ─── Single Toast ────────────────────────────────────────── */

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const dur = item.duration ?? 5000;
    if (dur > 0) {
      timerRef.current = setTimeout(() => onDismiss(item.id), dur);
    }
    return () => clearTimeout(timerRef.current);
  }, [item, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        "flex items-start gap-3 p-4 rounded-lg shadow-lg min-w-[320px] max-w-[420px]",
        "animate-in slide-in-from-right fade-in duration-300",
        variantStyles[item.variant],
      ].join(" ")}
    >
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
        className={`shrink-0 mt-0.5 ${iconColors[item.variant]}`}
        aria-hidden="true"
      >
        <path d={iconPaths[item.variant]} />
      </svg>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900">{item.title}</p>
        {item.description && (
          <p className="mt-1 text-sm text-neutral-500">{item.description}</p>
        )}
      </div>

      <button
        onClick={() => onDismiss(item.id)}
        className="shrink-0 p-0.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
        aria-label="Dismiss notification"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Provider ────────────────────────────────────────────── */

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { ...item, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      {/* Toast container — bottom-right */}
      <div
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 pointer-events-none"
      >
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastCard item={item} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
