// ─── Jamaica Parishes ─────────────────────────────────────────

export const PARISHES = [
  "Kingston",
  "St. Andrew",
  "St. Thomas",
  "Portland",
  "St. Mary",
  "St. Ann",
  "Trelawny",
  "St. James",
  "Hanover",
  "Westmoreland",
  "St. Elizabeth",
  "Manchester",
  "Clarendon",
  "St. Catherine",
] as const;

export type Parish = (typeof PARISHES)[number];

// ─── Service Categories ──────────────────────────────────────

export const SERVICE_CATEGORIES = [
  { key: "plumbing", label: "Plumbing", icon: "water" },
  { key: "electrical", label: "Electrical", icon: "flash" },
  { key: "carpentry", label: "Carpentry", icon: "hammer" },
  { key: "cleaning", label: "Cleaning", icon: "sparkles" },
  { key: "gardening", label: "Gardening", icon: "leaf" },
  { key: "painting", label: "Painting", icon: "color-palette" },
  { key: "masonry", label: "Masonry", icon: "construct" },
  { key: "roofing", label: "Roofing", icon: "home" },
  { key: "automotive", label: "Automotive", icon: "car" },
  { key: "catering", label: "Catering", icon: "restaurant" },
  { key: "tutoring", label: "Tutoring", icon: "school" },
  { key: "beauty", label: "Beauty", icon: "cut" },
  { key: "tailoring", label: "Tailoring", icon: "shirt" },
  { key: "moving", label: "Moving", icon: "cube" },
  { key: "tech_repair", label: "Tech Repair", icon: "phone-portrait" },
  { key: "photography", label: "Photography", icon: "camera" },
  { key: "event_planning", label: "Event Planning", icon: "calendar" },
  { key: "other", label: "Other", icon: "ellipsis-horizontal" },
] as const;

export type ServiceCategoryKey = (typeof SERVICE_CATEGORIES)[number]["key"];

// ─── Event Categories ────────────────────────────────────────

export const EVENT_CATEGORIES = [
  "Music",
  "Food & Drink",
  "Sports",
  "Community",
  "Business",
  "Arts & Culture",
  "Education",
  "Health & Wellness",
  "Nightlife",
  "Other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

// ─── Platform Fees ───────────────────────────────────────────

/** Platform fee percentage charged on transactions. */
export const PLATFORM_FEE_PERCENT = 3.2;

/** Default currency for the platform. */
export const DEFAULT_CURRENCY = "JMD";

// ─── Design System Colors ────────────────────────────────────

export const COLORS = {
  brand: {
    primary: "#1A56DB",    // Jobsy Blue
    secondary: "#16A34A",  // Trust Green
    accent: "#F59E0B",     // Action Amber
  },
  neutral: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
    950: "#030712",
  },
  semantic: {
    success: "#16A34A",
    warning: "#F59E0B",
    error: "#DC2626",
    info: "#1A56DB",
  },
} as const;

// ─── Pagination Defaults ─────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ─── Provider Defaults ───────────────────────────────────────

export const DEFAULT_SERVICE_RADIUS_KM = 25;
export const MAX_PORTFOLIO_ITEMS = 20;
export const MAX_SERVICES_PER_PROVIDER = 10;

// ─── Rating ──────────────────────────────────────────────────

export const MIN_RATING = 1;
export const MAX_RATING = 5;

// ─── Age Restrictions ────────────────────────────────────────

export const AGE_RESTRICTIONS = [
  "all_ages",
  "13+",
  "16+",
  "18+",
  "21+",
] as const;

export type AgeRestriction = (typeof AGE_RESTRICTIONS)[number];
