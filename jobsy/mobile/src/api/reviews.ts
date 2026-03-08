import { api } from "./client";

export interface ReviewCreate {
  reviewee_id: string;
  listing_id?: string;
  transaction_id?: string;
  rating: number;
  title?: string;
  body?: string;
  quality_rating?: number;
  punctuality_rating?: number;
  communication_rating?: number;
  value_rating?: number;
}

export interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  quality_rating: number | null;
  punctuality_rating: number | null;
  communication_rating: number | null;
  value_rating: number | null;
  is_verified: boolean;
  created_at: string;
}

export interface RatingSummary {
  user_id: string;
  total_reviews: number;
  average_rating: number;
  breakdown: {
    quality: number | null;
    punctuality: number | null;
    communication: number | null;
    value: number | null;
  } | null;
}

export async function createReview(data: ReviewCreate) {
  const res = await api.post("/api/reviews/", data);
  return res.data;
}

export async function getUserReviews(
  userId: string,
  params?: { limit?: number; offset?: number }
): Promise<Review[]> {
  const res = await api.get<Review[]>(`/api/reviews/user/${userId}`, { params });
  return res.data;
}

export async function getUserRatingSummary(userId: string): Promise<RatingSummary> {
  const res = await api.get<RatingSummary>(`/api/reviews/user/${userId}/summary`);
  return res.data;
}

export async function respondToReview(reviewId: string, body: string) {
  const res = await api.post(`/api/reviews/${reviewId}/respond`, { body });
  return res.data;
}

export async function flagReview(reviewId: string) {
  const res = await api.post(`/api/reviews/${reviewId}/flag`);
  return res.data;
}
