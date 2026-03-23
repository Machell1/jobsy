// ─── User & Auth ──────────────────────────────────────────────

export const UserRole = {
  USER: "user",
  PROVIDER: "provider",
  HIRER: "hirer",
  ADVERTISER: "advertiser",
  ADMIN: "admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AccountType = {
  INDIVIDUAL: "individual",
  ORGANIZATION: "organization",
  SCHOOL: "school",
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const OrgType = {
  BUSINESS: "business",
  NGO: "NGO",
  SCHOOL: "school",
  GOVERNMENT: "government",
} as const;
export type OrgType = (typeof OrgType)[keyof typeof OrgType];

export const OAuthProvider = {
  GOOGLE: "google",
  APPLE: "apple",
} as const;
export type OAuthProvider = (typeof OAuthProvider)[keyof typeof OAuthProvider];

// ─── Listing ──────────────────────────────────────────────────

export const ListingStatus = {
  ACTIVE: "active",
  PAUSED: "paused",
  FILLED: "filled",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
} as const;
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus];

export const ListingCategory = {
  PLUMBING: "plumbing",
  ELECTRICAL: "electrical",
  CARPENTRY: "carpentry",
  CLEANING: "cleaning",
  GARDENING: "gardening",
  PAINTING: "painting",
  MASONRY: "masonry",
  ROOFING: "roofing",
  AUTOMOTIVE: "automotive",
  CATERING: "catering",
  TUTORING: "tutoring",
  BEAUTY: "beauty",
  TAILORING: "tailoring",
  MOVING: "moving",
  TECH_REPAIR: "tech_repair",
  PHOTOGRAPHY: "photography",
  EVENT_PLANNING: "event_planning",
  OTHER: "other",
} as const;
export type ListingCategory =
  (typeof ListingCategory)[keyof typeof ListingCategory];

// ─── Booking ──────────────────────────────────────────────────

export const BookingStatus = {
  INQUIRY: "inquiry",
  QUOTED: "quoted",
  ACCEPTED: "accepted",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DISPUTED: "disputed",
} as const;
export type BookingStatus =
  (typeof BookingStatus)[keyof typeof BookingStatus];

export const LocationMode = {
  ONSITE: "onsite",
  REMOTE: "remote",
  HYBRID: "hybrid",
} as const;
export type LocationMode =
  (typeof LocationMode)[keyof typeof LocationMode];

// ─── Payment ──────────────────────────────────────────────────

export const PaymentStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;
export type PaymentStatus =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const EscrowStatus = {
  HELD: "held",
  RELEASED: "released",
  PAID_OUT: "paid_out",
  REFUNDED: "refunded",
} as const;
export type EscrowStatus =
  (typeof EscrowStatus)[keyof typeof EscrowStatus];

export const PayoutMethod = {
  BANK: "bank",
  MOBILE_MONEY: "mobile_money",
} as const;
export type PayoutMethod =
  (typeof PayoutMethod)[keyof typeof PayoutMethod];

// ─── Quote ────────────────────────────────────────────────────

export const QuoteStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  EXPIRED: "expired",
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

// ─── Review ───────────────────────────────────────────────────

export const ModerationStatus = {
  APPROVED: "approved",
  PENDING: "pending",
  REJECTED: "rejected",
} as const;
export type ModerationStatus =
  (typeof ModerationStatus)[keyof typeof ModerationStatus];

// ─── Event ────────────────────────────────────────────────────

export const EventStatus = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  DRAFT: "draft",
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const RSVPStatus = {
  GOING: "going",
  INTERESTED: "interested",
  NOT_GOING: "not_going",
} as const;
export type RSVPStatus = (typeof RSVPStatus)[keyof typeof RSVPStatus];

export const TicketStatus = {
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;
export type TicketStatus =
  (typeof TicketStatus)[keyof typeof TicketStatus];

// ─── Chat ─────────────────────────────────────────────────────

export const MessageType = {
  TEXT: "text",
  IMAGE: "image",
  SYSTEM: "system",
  BOOKING_UPDATE: "booking_update",
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

// ─── Provider ─────────────────────────────────────────────────

export const PricingMode = {
  QUOTE: "quote",
  FIXED: "fixed",
  HOURLY: "hourly",
  PACKAGE: "package",
} as const;
export type PricingMode = (typeof PricingMode)[keyof typeof PricingMode];

export const VerificationStatus = {
  UNVERIFIED: "unverified",
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
} as const;
export type VerificationStatus =
  (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const BadgeType = {
  PHONE_VERIFIED: "phone_verified",
  EMAIL_VERIFIED: "email_verified",
  ID_VERIFIED: "id_verified",
  BACKGROUND_CHECKED: "background_checked",
  BUSINESS_REGISTERED: "business_registered",
} as const;
export type BadgeType = (typeof BadgeType)[keyof typeof BadgeType];

export const BadgeLevel = {
  NONE: "none",
  BRONZE: "bronze",
  SILVER: "silver",
  GOLD: "gold",
  PLATINUM: "platinum",
} as const;
export type BadgeLevel = (typeof BadgeLevel)[keyof typeof BadgeLevel];

// ─── Dispute ──────────────────────────────────────────────────

export const DisputeStatus = {
  OPEN: "open",
  RESPONDED: "responded",
  UNDER_REVIEW: "under_review",
  RESOLVED: "resolved",
} as const;
export type DisputeStatus =
  (typeof DisputeStatus)[keyof typeof DisputeStatus];

export const DisputeOutcome = {
  REFUND_FULL: "refund_full",
  REFUND_PARTIAL: "refund_partial",
  RELEASE_TO_PROVIDER: "release_to_provider",
  SPLIT: "split",
} as const;
export type DisputeOutcome =
  (typeof DisputeOutcome)[keyof typeof DisputeOutcome];
