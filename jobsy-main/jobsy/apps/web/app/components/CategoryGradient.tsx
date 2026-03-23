"use client";

import { CATEGORY_CONFIG, type Category } from "@/lib/category-icons";

export function CategoryGradient({
  category,
  className = "",
}: {
  category: string;
  className?: string;
}) {
  const config = CATEGORY_CONFIG[category as Category] || CATEGORY_CONFIG["Other"];
  const Icon = config.icon;

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-gradient-to-br ${config.gradient} ${className}`}
    >
      <Icon
        className="absolute right-0 bottom-0 h-32 w-32 -translate-y-4 translate-x-4 text-white opacity-[0.08]"
        strokeWidth={1}
      />
    </div>
  );
}
