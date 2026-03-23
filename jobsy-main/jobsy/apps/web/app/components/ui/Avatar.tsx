"use client";

import { useState, type ImgHTMLAttributes } from "react";

/* ─── Size Maps ───────────────────────────────────────────── */

const sizeStyles = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-xl",
} as const;

const indicatorSizes = {
  xs: "w-2 h-2 border",
  sm: "w-2.5 h-2.5 border",
  md: "w-3 h-3 border-2",
  lg: "w-3.5 h-3.5 border-2",
  xl: "w-4 h-4 border-2",
} as const;

/* ─── Types ───────────────────────────────────────────────── */

export type AvatarSize = keyof typeof sizeStyles;

export interface AvatarProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "size" | "src"> {
  src?: string | null;
  alt: string;
  name?: string;
  size?: AvatarSize;
  online?: boolean;
  verified?: boolean;
}

/* ─── Helpers ─────────────────────────────────────────────── */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ─── Verified Badge Icon ─────────────────────────────────── */

function VerifiedBadge({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Verified"
    >
      <circle cx="12" cy="12" r="10" fill="#1A56DB" />
      <path
        d="M8 12l3 3 5-5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Component ───────────────────────────────────────────── */

export function Avatar({
  src,
  alt,
  name,
  size = "md",
  online,
  verified = false,
  className = "",
  ...props
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;
  const initials = name ? getInitials(name) : "?";

  return (
    <div
      className={`relative inline-flex shrink-0 ${sizeStyles[size]} ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          onError={() => setImgError(true)}
          className="w-full h-full rounded-full object-cover"
          {...props}
        />
      ) : (
        <span
          className="w-full h-full rounded-full bg-brand-primary/10 text-brand-primary font-semibold flex items-center justify-center select-none"
          role="img"
          aria-label={alt}
        >
          {initials}
        </span>
      )}

      {online != null && (
        <span
          className={[
            "absolute bottom-0 right-0 rounded-full border-white",
            indicatorSizes[size],
            online ? "bg-success" : "bg-neutral-300",
          ].join(" ")}
          aria-label={online ? "Online" : "Offline"}
        />
      )}

      {verified && (
        <VerifiedBadge
          className={`absolute -bottom-0.5 -right-0.5 ${
            size === "xs" || size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5"
          }`}
        />
      )}
    </div>
  );
}
