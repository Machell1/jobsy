"use client";

import { ShieldCheck } from "lucide-react";

interface VerifiedBadgeProps {
  variant?: "mini" | "prominent";
}

export function VerifiedBadge({ variant = "mini" }: VerifiedBadgeProps) {
  if (variant === "prominent") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-emerald-light)] px-3 py-1 text-xs font-semibold text-[var(--color-emerald)]">
        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
        Verified Provider
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-[var(--color-emerald)] p-0.5 text-white"
      title="Verified provider"
    >
      <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
    </span>
  );
}
