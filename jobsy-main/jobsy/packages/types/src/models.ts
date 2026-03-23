import type {
  AccountType,
  BadgeLevel,
  BadgeType,
  BookingStatus,
  DisputeOutcome,
  DisputeStatus,
  EscrowStatus,
  EventStatus,
  ListingCategory,
  ListingStatus,
  LocationMode,
  MessageType,
  ModerationStatus,
  OAuthProvider,
  OrgType,
  PaymentStatus,
  PricingMode,
  QuoteStatus,
  RSVPStatus,
  TicketStatus,
  UserRole,
  VerificationStatus,
} from "./enums";

// ─── User ─────────────────────────────────────────────────────

export interface User {
  id: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  roles: UserRole[];
  active_role: UserRole;
  is_verified: boolean;
  email_verified: boolean;
  oauth_provider: OAuthProvider | null;
  account_type: AccountType;
  org_name: string | null;
  org_registration_number: string | null;
  org_type: OrgType | null;
  org_representative_name: string | null;
  org_representative_title: string | null;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  active_role: UserRole;
  roles: UserRole[];
}

// ─── Profile ──────────────────────────────────────────────────

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  parish: string | null;
  service_category: string | null;
  is_provider: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Listing ──────────────────────────────────────────────────

export interface Listing {
  id: string;
  poster_id: string;
  title: string;
  description: string;
  category: ListingCategory;
  subcategory: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  latitude: number | null;
  longitude: number | null;
  geohash: string | null;
  parish: string | null;
  address_text: string | null;
  photos: string[];
  status: ListingStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Booking ──────────────────────────────────────────────────

export interface Booking {
  id: string;
  customer_id: string;
  provider_id: string;
  listing_id: string | null;
  service_id: string | null;
  title: string;
  description: string | null;
  status: BookingStatus;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  location_mode: LocationMode | null;
  location_text: string | null;
  parish: string | null;
  latitude: number | null;
  longitude: number | null;
  total_amount: number | null;
  currency: string;
  payment_status: PaymentStatus;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingEvent {
  id: string;
  booking_id: string;
  event_type: string;
  from_status: BookingStatus | null;
  to_status: BookingStatus | null;
  actor_id: string;
  actor_role: string;
  note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Quote {
  id: string;
  booking_id: string;
  provider_id: string;
  amount: number;
  currency: string;
  description: string | null;
  valid_until: string | null;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
}

// ─── Payment ──────────────────────────────────────────────────

export interface Transaction {
  id: string;
  payer_id: string;
  payee_id: string;
  listing_id: string | null;
  match_id: string | null;
  booking_id: string | null;
  amount: number;
  currency: string;
  platform_fee: number;
  net_amount: number;
  provider_payout: number | null;
  contract_id: string | null;
  stripe_payment_intent_id: string | null;
  escrow_status: EscrowStatus | null;
  status: PaymentStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  requested_at: string;
  completed_at: string | null;
}

export interface Refund {
  id: string;
  payment_id: string;
  booking_id: string | null;
  amount: number;
  currency: string;
  reason: string | null;
  status: PaymentStatus;
  initiated_by: string;
  processed_at: string | null;
  created_at: string;
}

// ─── Review ───────────────────────────────────────────────────

export interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  listing_id: string | null;
  transaction_id: string | null;
  booking_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  quality_rating: number | null;
  punctuality_rating: number | null;
  communication_rating: number | null;
  value_rating: number | null;
  is_verified: boolean;
  is_verified_purchase: boolean;
  moderation_status: ModerationStatus;
  created_at: string;
  updated_at: string;
}

export interface ReviewReply {
  id: string;
  review_id: string;
  responder_id: string;
  body: string;
  created_at: string;
}

export interface UserRating {
  user_id: string;
  total_reviews: number;
  average_rating: number;
  average_quality: number | null;
  average_punctuality: number | null;
  average_communication: number | null;
  average_value: number | null;
  updated_at: string;
}

export interface ReputationMetrics {
  user_id: string;
  total_jobs_completed: number;
  repeat_client_rate: number;
  response_rate: number;
  on_time_rate: number;
  cancellation_rate: number;
  badge_level: string;
  trust_score: number;
  updated_at: string;
}

// ─── Event (Pan di Ends) ──────────────────────────────────────

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  category: string | null;
  cover_image_url: string | null;
  cover_video_url: string | null;
  start_date: string;
  end_date: string | null;
  location_text: string | null;
  parish: string | null;
  is_free: boolean;
  ticket_price: number | null;
  currency: string;
  capacity: number | null;
  age_restriction: string | null;
  is_featured: boolean;
  status: EventStatus;
  rsvp_count: number;
  ticket_sold_count: number;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface EventTicket {
  id: string;
  event_id: string;
  user_id: string;
  quantity: number;
  total_amount: number;
  currency: string;
  status: TicketStatus;
  created_at: string;
}

export interface EventRSVP {
  id: string;
  event_id: string;
  user_id: string;
  status: RSVPStatus;
  created_at: string;
}

// ─── Chat ─────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  match_id: string;
  other_user_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  is_read: boolean;
  created_at: string;
}

// ─── Provider ─────────────────────────────────────────────────

export interface ProviderProfile {
  id: string;
  user_id: string;
  profile_id: string;
  headline: string | null;
  profession: string | null;
  years_of_experience: number | null;
  service_radius_km: number;
  pricing_mode: PricingMode;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  currency: string;
  response_time_hours: number | null;
  notice_board_enabled: boolean;
  is_available: boolean;
  verification_status: VerificationStatus;
  onboarding_step: number;
  onboarding_completed: boolean;
  completion_percentage: number;
  total_bookings: number;
  completed_bookings: number;
  cancellation_count: number;
  avg_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderService {
  id: string;
  provider_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_type: PricingMode;
  price_amount: number | null;
  currency: string;
  duration_minutes: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface VerificationBadge {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  evidence_url: string | null;
  status: VerificationStatus;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Dispute ──────────────────────────────────────────────────

export interface Dispute {
  id: string;
  contract_id: string;
  raiser_id: string;
  respondent_id: string;
  reason: string;
  evidence: string[];
  respondent_statement: string | null;
  respondent_evidence: string[];
  status: DisputeStatus;
  resolution: string | null;
  outcome: DisputeOutcome | null;
  resolved_by: string | null;
  escalated: boolean;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}
