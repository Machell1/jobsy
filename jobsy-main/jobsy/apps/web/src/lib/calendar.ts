// ---------------------------------------------------------------------------
// ICS calendar file generation
// ---------------------------------------------------------------------------

interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  /** Date in YYYY-MM-DD format */
  startDate: string;
  /** Time in HH:mm format (24h). If omitted, creates an all-day event. */
  startTime?: string;
  /** Duration in minutes. Defaults to 60. */
  durationMinutes?: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTimeUTC(date: string, time?: string): string {
  // Parse YYYY-MM-DD
  const [y, m, d] = date.split("-").map(Number);

  if (!time) {
    // All-day event uses VALUE=DATE format: YYYYMMDD
    return `${y}${pad(m)}${pad(d)}`;
  }

  const [h, min] = time.split(":").map(Number);
  return `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
}

function addMinutes(date: string, time: string, minutes: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const dt = new Date(y, m - 1, d, h, min + minutes);
  return (
    `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T` +
    `${pad(dt.getHours())}${pad(dt.getMinutes())}00`
  );
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@jobsyja.com`;
}

/**
 * Generate an ICS (iCalendar) file string from event data.
 */
export function generateICS(event: CalendarEvent): string {
  const uid = generateUID();
  const now = new Date();
  const dtstamp =
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T` +
    `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const duration = event.durationMinutes ?? 60;
  const isAllDay = !event.startTime;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jobsy//Jobsy Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `SUMMARY:${escapeICS(event.title)}`,
  ];

  if (isAllDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateTimeUTC(event.startDate)}`);
    // All-day event: end is next day
    const [y, m, d] = event.startDate.split("-").map(Number);
    const next = new Date(y, m - 1, d + 1);
    const endDate = `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`;
    lines.push(`DTEND;VALUE=DATE:${endDate}`);
  } else {
    lines.push(
      `DTSTART:${formatDateTimeUTC(event.startDate, event.startTime)}`,
    );
    lines.push(
      `DTEND:${addMinutes(event.startDate, event.startTime!, duration)}`,
    );
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`);
  }

  lines.push("STATUS:CONFIRMED");
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Trigger an ICS file download in the browser.
 */
export function downloadICS(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
