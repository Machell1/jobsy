/* ─── Types ───────────────────────────────────────────────── */

export type SkeletonVariant =
  | "text"
  | "circle"
  | "card"
  | "list-item"
  | "profile-header";

export interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  lines?: number;
  width?: string;
  height?: string;
}

/* ─── Base Pulse Bar ──────────────────────────────────────── */

function Pulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-neutral-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

/* ─── Variants ────────────────────────────────────────────── */

function TextSkeleton({ lines = 3, width }: { lines?: number; width?: string }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading content">
      {Array.from({ length: lines }).map((_, i) => (
        <Pulse
          key={i}
          className={`h-4 ${
            i === lines - 1 ? "w-3/4" : width ?? "w-full"
          }`}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function CircleSkeleton({ width = "w-10", height = "h-10" }: { width?: string; height?: string }) {
  return (
    <div role="status" aria-label="Loading">
      <Pulse className={`${width} ${height} rounded-full`} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div
      className="rounded-lg border border-neutral-200 p-4 space-y-4"
      role="status"
      aria-label="Loading card"
    >
      <Pulse className="h-40 w-full rounded-md" />
      <Pulse className="h-4 w-3/4" />
      <Pulse className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Pulse className="h-8 w-20 rounded-md" />
        <Pulse className="h-8 w-20 rounded-md" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function ListItemSkeleton() {
  return (
    <div
      className="flex items-center gap-3 py-3"
      role="status"
      aria-label="Loading list item"
    >
      <Pulse className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Pulse className="h-4 w-1/3" />
        <Pulse className="h-3 w-2/3" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function ProfileHeaderSkeleton() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-label="Loading profile"
    >
      {/* Cover */}
      <Pulse className="h-32 w-full rounded-lg" />
      {/* Avatar + info */}
      <div className="flex items-center gap-4 -mt-8 px-4">
        <Pulse className="w-20 h-20 rounded-full shrink-0 border-4 border-white" />
        <div className="flex-1 space-y-2 pt-6">
          <Pulse className="h-5 w-1/3" />
          <Pulse className="h-4 w-1/4" />
          <Pulse className="h-3 w-1/5" />
        </div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/* ─── Component ───────────────────────────────────────────── */

export function Skeleton({
  variant = "text",
  className = "",
  lines,
  width,
  height,
}: SkeletonProps) {
  const wrapperClass = className;

  switch (variant) {
    case "text":
      return (
        <div className={wrapperClass}>
          <TextSkeleton lines={lines} width={width} />
        </div>
      );
    case "circle":
      return (
        <div className={wrapperClass}>
          <CircleSkeleton width={width} height={height} />
        </div>
      );
    case "card":
      return (
        <div className={wrapperClass}>
          <CardSkeleton />
        </div>
      );
    case "list-item":
      return (
        <div className={wrapperClass}>
          {Array.from({ length: lines ?? 3 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
      );
    case "profile-header":
      return (
        <div className={wrapperClass}>
          <ProfileHeaderSkeleton />
        </div>
      );
    default:
      return (
        <div className={wrapperClass}>
          <Pulse className={`${width ?? "w-full"} ${height ?? "h-4"}`} />
        </div>
      );
  }
}
