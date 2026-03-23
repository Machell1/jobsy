// ─── API Response Envelope ────────────────────────────────────

/**
 * Standard API success response wrapper.
 * All gateway endpoints return this shape.
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

/**
 * Standard API error response.
 */
export interface ApiError {
  error: string;
  message: string;
  status_code: number;
  details?: Record<string, unknown>;
}

/**
 * Paginated list response.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// ─── Auth Request/Response Shapes ─────────────────────────────

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface RegisterRequest {
  phone: string;
  password: string;
  email?: string;
  role?: string;
  roles?: string[];
  account_type?: string;
  display_name?: string;
  parish?: string;
  service_category?: string;
  bio?: string;
  is_provider?: boolean;
}

export interface OAuthLoginRequest {
  provider: "google" | "apple";
  id_token: string;
  role?: string;
  roles?: string[];
}

export interface ForgotPasswordRequest {
  phone?: string;
  email?: string;
}

export interface ResetPasswordRequest {
  phone: string;
  otp: string;
  new_password: string;
}

// ─── Listing Request Shapes ──────────────────────────────────

export interface CreateListingRequest {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  budget_min?: number;
  budget_max?: number;
  currency?: string;
  latitude?: number;
  longitude?: number;
  parish?: string;
  address_text?: string;
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  category?: string;
  budget_min?: number;
  budget_max?: number;
  status?: string;
}

// ─── Booking Request Shapes ──────────────────────────────────

export interface CreateBookingRequest {
  title: string;
  description?: string;
  provider_id: string;
  listing_id?: string;
  service_id?: string;
  scheduled_date?: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
  location_mode?: string;
  location_text?: string;
  parish?: string;
}

export interface UpdateBookingStatusRequest {
  status: string;
  note?: string;
  cancellation_reason?: string;
}

export interface CreateQuoteRequest {
  amount: number;
  currency?: string;
  description?: string;
  valid_until?: string;
}

// ─── Review Request Shapes ───────────────────────────────────

export interface CreateReviewRequest {
  reviewee_id: string;
  listing_id?: string;
  booking_id?: string;
  rating: number;
  title?: string;
  body?: string;
  quality_rating?: number;
  punctuality_rating?: number;
  communication_rating?: number;
  value_rating?: number;
}

// ─── Event Request Shapes ────────────────────────────────────

export interface CreateEventRequest {
  title: string;
  description?: string;
  category?: string;
  cover_image_url?: string;
  cover_video_url?: string;
  start_date: string;
  end_date?: string;
  location_text?: string;
  parish?: string;
  is_free?: boolean;
  ticket_price?: number;
  currency?: string;
  capacity?: number;
  age_restriction?: string;
  tags?: string[];
}
