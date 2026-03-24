"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

export function SaveButton() {
  const [saved, setSaved] = useState(false);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaved(!saved);
      }}
      className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white hover:scale-110"
      aria-label={saved ? "Unsave provider" : "Save provider"}
    >
      <Heart
        className={`h-4 w-4 transition-colors ${
          saved
            ? "heart-saved fill-[var(--color-gold)] text-[var(--color-gold)]"
            : "text-[var(--color-neutral-400)] hover:text-[var(--color-gold)]"
        }`}
        strokeWidth={1.5}
      />
    </button>
  );
}
