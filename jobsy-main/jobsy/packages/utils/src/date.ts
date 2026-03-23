const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Format an ISO date string into a human-readable date.
 *
 * @example formatDate("2025-03-15T10:00:00Z") // "Mar 15, 2025"
 * @example formatDate("2025-03-15T10:00:00Z", "long") // "March 15, 2025"
 */
export function formatDate(
  isoString: string,
  style: "short" | "medium" | "long" = "medium",
): string {
  const date = new Date(isoString);

  const options: Intl.DateTimeFormatOptions = {
    short: { month: "short", day: "numeric" } as const,
    medium: { month: "short", day: "numeric", year: "numeric" } as const,
    long: { month: "long", day: "numeric", year: "numeric" } as const,
  }[style];

  return date.toLocaleDateString("en-JM", options);
}

/**
 * Format a date as relative time (e.g. "2 hours ago", "in 3 days").
 */
export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = now - then;
  const absDiff = Math.abs(diff);
  const isFuture = diff < 0;

  const relative = (value: number, unit: string): string => {
    const rounded = Math.floor(value);
    const plural = rounded === 1 ? "" : "s";
    return isFuture
      ? `in ${rounded} ${unit}${plural}`
      : `${rounded} ${unit}${plural} ago`;
  };

  if (absDiff < MINUTE) return "just now";
  if (absDiff < HOUR) return relative(absDiff / MINUTE, "minute");
  if (absDiff < DAY) return relative(absDiff / HOUR, "hour");
  if (absDiff < WEEK) return relative(absDiff / DAY, "day");

  // Beyond a week, use absolute date
  return formatDate(isoString, "medium");
}

/**
 * Check if an ISO date string is today.
 */
export function isToday(isoString: string): boolean {
  const date = new Date(isoString);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * Check if an ISO date string falls within the current week (Mon-Sun).
 */
export function isThisWeek(isoString: string): boolean {
  const date = new Date(isoString);
  const now = new Date();

  // Get Monday of the current week
  const monday = new Date(now);
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  // Get Sunday end of the current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return date >= monday && date <= sunday;
}

/**
 * Format a time string (HH:MM) into 12-hour format.
 *
 * @example formatTime("14:30") // "2:30 PM"
 */
export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, "0")} ${period}`;
}
