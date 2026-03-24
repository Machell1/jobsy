"use client";

import { CheckCircle2, Circle } from "lucide-react";

interface ProfileItem {
  label: string;
  done: boolean;
}

export function ProfileStrengthBar({ items }: { items: ProfileItem[] }) {
  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const percent = Math.round((completed / total) * 100);

  return (
    <div className="rounded-[14px] border border-[var(--color-neutral-200)] bg-white p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[var(--color-neutral-950)]">Profile Strength</h3>
        <span className="text-sm font-bold text-[var(--color-navy)]">{percent}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-[var(--color-neutral-100)] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--color-navy)] to-[var(--color-gold)] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 text-[var(--color-emerald)]" />
            ) : (
              <Circle className="h-4 w-4 text-[var(--color-neutral-300)]" />
            )}
            <span className={item.done ? "text-[var(--color-neutral-400)] line-through" : "text-[var(--color-neutral-600)]"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
