"use client";

import { Users } from "lucide-react";

interface BookedCountProps {
  count: number;
}

export function BookedCount({ count }: BookedCountProps) {
  if (count <= 5) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-neutral-600)]">
      <Users className="h-4 w-4 text-[var(--color-neutral-400)]" strokeWidth={1.5} />
      Booked {count} times
    </span>
  );
}
