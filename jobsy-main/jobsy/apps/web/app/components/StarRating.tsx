"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: "sm" | "md";
}

export function StarRating({ rating, count, size = "sm" }: StarRatingProps) {
  const starSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const totalStars = 5;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: totalStars }).map((_, i) => {
          if (i < fullStars) {
            return (
              <Star
                key={i}
                className={`${starSize} fill-amber-400 text-amber-400`}
                strokeWidth={1.5}
              />
            );
          }
          if (i === fullStars && hasHalf) {
            return (
              <div key={i} className="relative">
                <Star
                  className={`${starSize} text-[var(--color-neutral-200)]`}
                  strokeWidth={1.5}
                />
                <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                  <Star
                    className={`${starSize} fill-amber-400 text-amber-400`}
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            );
          }
          return (
            <Star
              key={i}
              className={`${starSize} text-[var(--color-neutral-200)]`}
              strokeWidth={1.5}
            />
          );
        })}
      </div>
      <span className="text-sm font-semibold text-[var(--color-neutral-950)]">
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className="text-sm text-[var(--color-neutral-400)]">({count})</span>
      )}
    </div>
  );
}
