"use client";

import {
  forwardRef,
  useState,
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";

/* ─── Types ───────────────────────────────────────────────── */

interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  fullWidth?: boolean;
}

export interface InputFieldProps
  extends BaseInputProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  as?: "input";
}

export interface TextareaFieldProps
  extends BaseInputProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "prefix"> {
  as: "textarea";
  rows?: number;
}

export type InputProps = InputFieldProps | TextareaFieldProps;

/* ─── Eye Icon ────────────────────────────────────────────── */

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
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
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
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
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

/* ─── Component ───────────────────────────────────────────── */

export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps
>((props, ref) => {
  const {
    label,
    error,
    helperText,
    prefixIcon,
    suffixIcon,
    fullWidth = true,
    className = "",
    ...rest
  } = props;

  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;

  const [showPassword, setShowPassword] = useState(false);
  const isPassword = props.as !== "textarea" && props.type === "password";

  const baseClasses = [
    "block rounded-lg border bg-white text-neutral-900 placeholder:text-neutral-400",
    "transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary",
    "disabled:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50",
    error
      ? "border-error focus:ring-error focus:border-error"
      : "border-neutral-300",
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  const isTextarea = props.as === "textarea";

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {prefixIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            {prefixIcon}
          </span>
        )}

        {isTextarea ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={inputId}
            rows={(rest as TextareaFieldProps).rows ?? 4}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={`${baseClasses} min-h-[96px] px-3 py-2.5 text-base`}
            {...(rest as Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "prefix">)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            id={inputId}
            type={isPassword && showPassword ? "text" : (rest as InputFieldProps).type}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={[
              baseClasses,
              "h-12 text-base",
              prefixIcon ? "pl-10" : "px-3",
              suffixIcon || isPassword ? "pr-10" : "px-3",
            ]
              .filter(Boolean)
              .join(" ")}
            {...(rest as Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix">)}
          />
        )}

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <EyeIcon open={showPassword} />
          </button>
        )}

        {!isPassword && suffixIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            {suffixIcon}
          </span>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p id={helperId} className="mt-1.5 text-sm text-neutral-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";
