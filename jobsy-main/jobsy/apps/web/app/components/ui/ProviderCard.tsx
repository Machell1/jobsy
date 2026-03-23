"use client";

import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { StarRating } from "./StarRating";

/* ─── Types ───────────────────────────────────────────────── */

export interface ProviderCardProps {
  id: string;
  name: string;
  photo?: string | null;
  category: string;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  /** Distance in km */
  distance?: number;
  verified?: boolean;
  /** Average response time as human-readable string, e.g. "~2 hours" */
  responseTime?: string;
  onClick?: (id: string) => void;
  className?: string;
}

/* ─── Icons ───────────────────────────────────────────────── */

function MapPinIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/* ─── Component ───────────────────────────────────────────── */

export function ProviderCard({
  id,
  name,
  photo,
  category,
  rating,
  reviewCount,
  priceFrom,
  distance,
  verified = false,
  responseTime,
  onClick,
  className = "",
}: ProviderCardProps) {
  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => onClick?.(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(id);
        }
      }}
      className={[
        "group rounded-lg bg-white border border-neutral-200 p-4",
        "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
        className,
      ].join(" ")}
      aria-label={`${name}, ${category}`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar
          src={photo}
          alt={name}
          name={name}
          size="lg"
          verified={verified}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-neutral-900 truncate font-[family-name:var(--font-heading)]">
              {name}
            </h3>
          </div>

          <p className="text-sm text-neutral-500 mt-0.5">{category}</p>

          {/* Rating + reviews */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <StarRating value={rating} size={14} />
            <span className="text-sm font-medium text-neutral-700">
              {rating.toFixed(1)}
            </span>
            <span className="text-sm text-neutral-400">
              ({reviewCount})
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <p className="text-sm text-neutral-500">From</p>
          <p className="text-lg font-bold text-neutral-900">
            ${priceFrom.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Trust signals row */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-100">
        {distance != null && (
          <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
            <MapPinIcon />
            {distance < 1
              ? `${Math.round(distance * 1000)}m`
              : `${distance.toFixed(1)}km`}
          </span>
        )}

        {responseTime && (
          <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
            <ClockIcon />
            Responds in {responseTime}
          </span>
        )}

        {verified && (
          <Badge variant="success" size="sm">
            Verified
          </Badge>
        )}
      </div>
    </article>
  );
}
