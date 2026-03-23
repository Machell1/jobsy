"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_avatar?: string;
  rating: number;
  comment: string;
  created_at: string;
  service_type?: string;
  response?: string;
  response_at?: string;
  is_flagged?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Flag state
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [showFlagModal, setShowFlagModal] = useState<string | null>(null);
  const [flagError, setFlagError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    apiGet<Review[] | { items?: Review[]; data?: Review[]; reviews?: Review[] }>(
      "/api/reviews/received",
    )
      .then((res) => {
        const items = Array.isArray(res)
          ? res
          : res.items ?? res.data ?? res.reviews ?? [];
        setReviews(items);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load reviews",
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleReply(reviewId: string) {
    if (!replyText.trim()) return;
    setReplyError(null);
    setSubmittingReply(true);
    try {
      await apiPost(`/api/reviews/${reviewId}/respond`, {
        response: replyText.trim(),
      });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                response: replyText.trim(),
                response_at: new Date().toISOString(),
              }
            : r,
        ),
      );
      setReplyingTo(null);
      setReplyText("");
    } catch (err) {
      setReplyError(
        err instanceof ApiError ? err.detail : "Failed to submit reply",
      );
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleFlag(reviewId: string) {
    setFlagError(null);
    setFlaggingId(reviewId);
    try {
      await apiPost(`/api/reviews/${reviewId}/flag`, {
        reason: flagReason.trim() || undefined,
      });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, is_flagged: true } : r,
        ),
      );
      setShowFlagModal(null);
      setFlagReason("");
    } catch (err) {
      setFlagError(
        err instanceof ApiError ? err.detail : "Failed to flag review",
      );
    } finally {
      setFlaggingId(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-JM", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function renderStars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={i < rating ? "text-yellow-400" : "text-neutral-300"}
        aria-hidden="true"
      >
        {"\u2605"}
      </span>
    ));
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Reviews</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Reviews you&apos;ve received from customers
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg border border-error/30 bg-red-50 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-primary" />
        </div>
      )}

      {/* Reviews list */}
      {!isLoading && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-neutral-200 bg-white p-5"
            >
              {/* Review header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-bold text-brand-primary">
                    {review.reviewer_avatar ? (
                      <img
                        src={review.reviewer_avatar}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      review.reviewer_name?.charAt(0) ?? "?"
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {review.reviewer_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex"
                        aria-label={`${review.rating} out of 5 stars`}
                      >
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-xs text-neutral-400">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Flag button */}
                  {!review.is_flagged ? (
                    <button
                      onClick={() => {
                        setShowFlagModal(review.id);
                        setFlagReason("");
                        setFlagError(null);
                      }}
                      className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-error"
                      title="Report review"
                      aria-label="Report review"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 3v18h2V3H3zm4 0v12h9l-3-6 3-6H7z"
                        />
                      </svg>
                    </button>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-error">
                      Reported
                    </span>
                  )}
                </div>
              </div>

              {/* Review body */}
              {review.service_type && (
                <span className="mt-2 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                  {review.service_type}
                </span>
              )}
              <p className="mt-2 text-sm text-neutral-700">{review.comment}</p>

              {/* Existing reply */}
              {review.response && (
                <div className="mt-3 rounded-lg border-l-4 border-brand-primary bg-brand-primary/5 p-3">
                  <p className="text-xs font-medium text-brand-primary">
                    Your Response
                    {review.response_at && (
                      <span className="ml-2 font-normal text-neutral-400">
                        {formatDate(review.response_at)}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">
                    {review.response}
                  </p>
                </div>
              )}

              {/* Reply form */}
              {!review.response && replyingTo !== review.id && (
                <button
                  onClick={() => {
                    setReplyingTo(review.id);
                    setReplyText("");
                    setReplyError(null);
                  }}
                  className="mt-3 text-sm font-medium text-brand-primary hover:underline"
                >
                  Reply to this review
                </button>
              )}

              {replyingTo === review.id && (
                <div className="mt-3 space-y-2">
                  {replyError && (
                    <p className="text-xs text-error">{replyError}</p>
                  )}
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write your response..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    aria-label="Reply to review"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReply(review.id)}
                      disabled={submittingReply || !replyText.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submittingReply && (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      )}
                      Submit Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && reviews.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 text-5xl">{"\u{2B50}"}</div>
          <h3 className="text-lg font-medium text-neutral-900">
            No reviews yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
            Reviews from your customers will appear here. Complete bookings to
            start receiving reviews.
          </p>
        </div>
      )}

      {/* Flag modal */}
      {showFlagModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Report review"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                Report Review
              </h2>
              <button
                onClick={() => setShowFlagModal(null)}
                className="rounded-lg p-1.5 transition hover:bg-neutral-100"
                aria-label="Close"
              >
                {"\u2715"}
              </button>
            </div>

            {flagError && (
              <div className="mx-4 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
                {flagError}
              </div>
            )}

            <div className="space-y-4 p-4">
              <p className="text-sm text-neutral-600">
                Please tell us why you are reporting this review. Our team will
                review your report.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Reason
                </label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder="Describe why this review is inappropriate..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowFlagModal(null)}
                  className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleFlag(showFlagModal)}
                  disabled={flaggingId !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {flaggingId && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  Report Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
