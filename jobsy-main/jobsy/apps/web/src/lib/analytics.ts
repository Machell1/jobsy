/**
 * Jobsy Analytics — PostHog Retention Events
 *
 * These five funnel events track the critical user retention metrics
 * defined in the UX design spec. Each has a target conversion rate
 * that should be monitored in PostHog dashboards.
 *
 * Install posthog-js when ready:
 *   npm i posthog-js
 *
 * Initialize PostHog in your root layout or _app:
 *   posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
 *     api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
 *   });
 */

/* ─── Types ───────────────────────────────────────────────── */

export interface AnalyticsProperties {
  [key: string]: string | number | boolean | null | undefined;
}

/* ─── Safe capture wrapper ────────────────────────────────── */

function capture(event: string, properties?: AnalyticsProperties): void {
  if (typeof window === "undefined") return;

  // posthog-js attaches to window.posthog when loaded
  const ph = (window as unknown as Record<string, unknown>).posthog as
    | { capture: (event: string, props?: AnalyticsProperties) => void }
    | undefined;

  if (ph?.capture) {
    ph.capture(event, properties);
  } else if (process.env.NODE_ENV === "development") {
    console.debug(`[analytics] ${event}`, properties);
  }
}

/* ─── Retention Events ────────────────────────────────────── */

/**
 * Fired when a user clicks a provider card from search results.
 * Target: > 40% of searches view a profile.
 */
export function trackSearchToProfile(properties: {
  searchQuery: string;
  providerId: string;
  resultPosition: number;
  category?: string;
  parish?: string;
}): void {
  capture("search_to_profile", properties);
}

/**
 * Fired when a user clicks "Book Now" or selects a service from
 * a provider profile page.
 * Target: > 25% of profile views start a booking.
 */
export function trackProfileToBookingStarted(properties: {
  providerId: string;
  serviceId: string;
  serviceName: string;
  price: number;
}): void {
  capture("profile_to_booking_started", properties);
}

/**
 * Fired when a booking reaches "confirmed" status (payment successful).
 * Target: > 70% of started bookings complete.
 */
export function trackBookingStartedToConfirmed(properties: {
  bookingId: string;
  providerId: string;
  serviceId: string;
  totalAmount: number;
  paymentMethod?: string;
}): void {
  capture("booking_started_to_confirmed", properties);
}

/**
 * Fired when a user returns to Jobsy within 7 days of their last visit.
 * Target: > 30% of users return within 7 days.
 *
 * Typically tracked server-side or on app init by comparing last_visit
 * timestamp stored in localStorage / cookie.
 */
export function trackReturnVisit7d(properties: {
  daysSinceLastVisit: number;
  userId?: string;
}): void {
  capture("return_visit_7d", properties);
}

/**
 * Fired when a user submits a review for a completed booking.
 * Target: > 50% of completed bookings leave a review.
 */
export function trackReviewCompletion(properties: {
  bookingId: string;
  providerId: string;
  rating: number;
  hasText: boolean;
}): void {
  capture("review_completion", properties);
}

/* ─── Return Visit Detection Helper ──────────────────────── */

const LAST_VISIT_KEY = "jobsy_last_visit";

/**
 * Call this on app mount to detect and fire return_visit_7d events.
 * Stores the last visit timestamp in localStorage.
 */
export function detectReturnVisit(): void {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const lastVisitStr = localStorage.getItem(LAST_VISIT_KEY);

  if (lastVisitStr) {
    const lastVisit = parseInt(lastVisitStr, 10);
    const daysSince = (now - lastVisit) / (1000 * 60 * 60 * 24);

    if (daysSince >= 1 && daysSince <= 7) {
      trackReturnVisit7d({ daysSinceLastVisit: Math.round(daysSince) });
    }
  }

  localStorage.setItem(LAST_VISIT_KEY, String(now));
}
