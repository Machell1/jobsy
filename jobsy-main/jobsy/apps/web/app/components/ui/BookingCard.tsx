"use client";

import { Badge, type BadgeVariant } from "./Badge";
import { Button } from "./Button";
import { Avatar } from "./Avatar";

/* ─── Types ───────────────────────────────────────────────── */

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface BookingCardProps {
  id: string;
  serviceName: string;
  /** The other party (provider if user is client, client if user is provider) */
  otherParty: {
    name: string;
    photo?: string | null;
  };
  date: string;
  time: string;
  status: BookingStatus;
  onCancel?: (id: string) => void;
  onReschedule?: (id: string) => void;
  onReview?: (id: string) => void;
  onClick?: (id: string) => void;
  className?: string;
}

/* ─── Status Config ───────────────────────────────────────── */

const statusConfig: Record<
  BookingStatus,
  { label: string; variant: BadgeVariant }
> = {
  pending: { label: "Pending", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "error" },
};

/* ─── Icons ───────────────────────────────────────────────── */

function CalendarIcon() {
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
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
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

export function BookingCard({
  id,
  serviceName,
  otherParty,
  date,
  time,
  status,
  onCancel,
  onReschedule,
  onReview,
  onClick,
  className = "",
}: BookingCardProps) {
  const { label, variant } = statusConfig[status];

  const showCancel = status === "pending" || status === "confirmed";
  const showReschedule = status === "pending" || status === "confirmed";
  const showReview = status === "completed";

  return (
    <article
      className={[
        "rounded-lg bg-white border border-neutral-200 p-4",
        onClick ? "cursor-pointer hover:shadow-md transition-shadow" : "",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
        className,
      ].join(" ")}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(id)}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(id);
        }
      }}
      aria-label={`${serviceName} booking, ${label}`}
    >
      {/* Top row: service name + status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold text-neutral-900 font-[family-name:var(--font-heading)]">
          {serviceName}
        </h3>
        <Badge variant={variant} size="sm" dot>
          {label}
        </Badge>
      </div>

      {/* Other party */}
      <div className="flex items-center gap-2 mb-3">
        <Avatar
          src={otherParty.photo}
          alt={otherParty.name}
          name={otherParty.name}
          size="sm"
        />
        <span className="text-sm text-neutral-700">{otherParty.name}</span>
      </div>

      {/* Date + time */}
      <div className="flex items-center gap-4 text-sm text-neutral-500 mb-4">
        <span className="inline-flex items-center gap-1">
          <CalendarIcon />
          {date}
        </span>
        <span className="inline-flex items-center gap-1">
          <ClockIcon />
          {time}
        </span>
      </div>

      {/* Actions */}
      {(showCancel || showReschedule || showReview) && (
        <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
          {showReschedule && onReschedule && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onReschedule(id);
              }}
            >
              Reschedule
            </Button>
          )}
          {showCancel && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(id);
              }}
              className="text-error hover:text-error hover:bg-red-50"
            >
              Cancel
            </Button>
          )}
          {showReview && onReview && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onReview(id);
              }}
            >
              Leave Review
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
