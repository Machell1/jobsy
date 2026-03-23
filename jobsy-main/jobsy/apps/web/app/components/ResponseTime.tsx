"use client";

import { Clock } from "lucide-react";

interface ResponseTimeProps {
  hours: number;
}

export function ResponseTime({ hours }: ResponseTimeProps) {
  const label = hours < 1 ? "under 1 hour" : `~${hours} hour${hours === 1 ? "" : "s"}`;

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-neutral-600)]">
      <Clock className="h-4 w-4 text-[var(--color-neutral-400)]" strokeWidth={1.5} />
      Responds in {label}
    </span>
  );
}
