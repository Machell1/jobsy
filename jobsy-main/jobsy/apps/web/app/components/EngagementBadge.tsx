"use client";
import { Emoji } from "@/lib/emoji";

type BadgeVariant = "hot" | "new" | "fast";

const BADGE_CONFIG = {
  hot: { emoji: "\uD83D\uDD25", label: "In demand", bg: "bg-orange-50", border: "border-orange-100", text: "text-orange-700" },
  new: { emoji: "\u2728", label: "New provider", bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-700" },
  fast: { emoji: "\u26A1", label: "Responds fast", bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700" },
};

export function EngagementBadge({ variant }: { variant: BadgeVariant }) {
  const config = BADGE_CONFIG[variant];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${config.bg} border ${config.border} px-2 py-0.5 text-xs font-semibold ${config.text}`}>
      <Emoji emoji={config.emoji} size={14} />
      {config.label}
    </span>
  );
}
