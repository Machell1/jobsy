"use client";

import { useState, useCallback, type KeyboardEvent } from "react";

/* ─── Types ───────────────────────────────────────────────── */

export interface StarRatingProps {
  /** Current rating value (0-5, supports .5 increments for display) */
  value: number;
  /** If provided, component becomes interactive */
  onChange?: (value: number) => void;
  /** Max stars */
  max?: number;
  /** Size of each star in pixels */
  size?: number;
  /** Show numeric label beside stars */
  showLabel?: boolean;
  className?: string;
}

/* ─── Star SVG ────────────────────────────────────────────── */

function Star({
  fill,
  size,
}: {
  fill: "full" | "half" | "empty";
  size: number;
}) {
  const starPath =
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

  if (fill === "full") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="#F59E0B"
        stroke="#F59E0B"
        strokeWidth="1"
        aria-hidden="true"
      >
        <path d={starPath} />
      </svg>
    );
  }

  if (fill === "half") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="half-clip">
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
        {/* Empty star background */}
        <path d={starPath} fill="none" stroke="#D1D5DB" strokeWidth="1" />
        {/* Half-filled */}
        <path
          d={starPath}
          fill="#F59E0B"
          stroke="#F59E0B"
          strokeWidth="1"
          clipPath="url(#half-clip)"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#D1D5DB"
      strokeWidth="1"
      aria-hidden="true"
    >
      <path d={starPath} />
    </svg>
  );
}

/* ─── Component ───────────────────────────────────────────── */

export function StarRating({
  value,
  onChange,
  max = 5,
  size = 20,
  showLabel = false,
  className = "",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const isInteractive = !!onChange;
  const displayValue = hoverValue ?? value;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!onChange) return;

      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        onChange(Math.min(value + 1, max));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        onChange(Math.max(value - 1, 0));
      }
    },
    [onChange, value, max]
  );

  const stars = Array.from({ length: max }, (_, i) => {
    const starNumber = i + 1;

    let fill: "full" | "half" | "empty" = "empty";
    if (displayValue >= starNumber) {
      fill = "full";
    } else if (displayValue >= starNumber - 0.5) {
      fill = "half";
    }

    return (
      <span
        key={i}
        className={isInteractive ? "cursor-pointer" : ""}
        onClick={isInteractive ? () => onChange(starNumber) : undefined}
        onMouseEnter={isInteractive ? () => setHoverValue(starNumber) : undefined}
        onMouseLeave={isInteractive ? () => setHoverValue(null) : undefined}
      >
        <Star fill={fill} size={size} />
      </span>
    );
  });

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role={isInteractive ? "radiogroup" : "img"}
      aria-label={`Rating: ${value} out of ${max} stars`}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
    >
      {stars}
      {showLabel && (
        <span className="ml-1.5 text-sm font-medium text-neutral-700">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
