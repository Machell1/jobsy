"use client";

import { useState } from "react";

const CATEGORIES = [
  "All",
  "Cleaning",
  "Plumbing",
  "Electrical",
  "Beauty",
  "Gardening",
  "Photography",
  "Carpentry",
  "Painting",
  "AC Repair",
  "Moving",
  "Catering",
];

interface CategoryPillsProps {
  onSelect?: (category: string) => void;
}

export function CategoryPills({ onSelect }: CategoryPillsProps) {
  const [active, setActive] = useState("All");

  const handleSelect = (cat: string) => {
    setActive(cat);
    onSelect?.(cat);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => handleSelect(cat)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            active === cat
              ? "bg-[#6366F1] text-white"
              : "bg-white text-[#4A4A42] border border-[#E0DDD7] hover:border-[#6366F1]/30 hover:text-[#6366F1]"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
