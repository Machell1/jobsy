"use client";

import Link from "next/link";
import { CATEGORY_CONFIG, type Category } from "@/lib/category-icons";

export function CategoryTile({ category }: { category: string }) {
  const config = CATEGORY_CONFIG[category as Category] || CATEGORY_CONFIG["Other"];
  const Icon = config.icon;

  return (
    <Link
      href={`/search?category=${encodeURIComponent(category)}`}
      className="group flex flex-col items-center gap-3 rounded-[14px] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-6 shadow-[var(--shadow-xs)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]"
    >
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-[10px] ${config.bg} ${config.border} border transition-transform duration-200 group-hover:scale-105`}
      >
        <Icon className={`h-6 w-6 ${config.color}`} strokeWidth={1.5} />
      </div>
      <span className="text-sm font-medium text-[var(--color-neutral-800)]">
        {category}
      </span>
    </Link>
  );
}
