"use client";

import { Emoji } from "@/lib/emoji";

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function DashboardGreeting({ name }: { name?: string }) {
  const greeting = `Good ${getTimeOfDay()}`;
  const displayName = name || "there";

  return (
    <span className="flex items-center gap-2">
      <span className="font-display text-2xl font-bold text-[var(--color-neutral-950)]">
        {greeting}, {displayName}
      </span>
      <Emoji emoji="\uD83D\uDC4B" size={28} label="wave" />
    </span>
  );
}
