"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import type { VerificationBadge } from "@jobsy/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Provider {
  id: string;
  display_name: string;
  bio?: string;
  category?: string;
  parish?: string;
  rating?: number;
  average_rating?: number;
  review_count?: number;
  total_reviews?: number;
  is_verified?: boolean;
  skills?: string[];
  services?: Service[];
  phone?: string;
  email?: string;
  created_at?: string;
  level?: number;
}

interface Service {
  id?: string;
  name: string;
  description?: string;
  price?: number;
  duration?: string;
}

interface PortfolioItem {
  id?: string;
  title: string;
  description?: string;
  image_url?: string;
}

interface Review {
  id: string;
  reviewer_display_name?: string;
  reviewer_name?: string;
  rating: number;
  comment?: string;
  text?: string;
  created_at: string;
}

const TABS = ["About", "Portfolio", "Services", "Reviews"] as const;
type Tab = (typeof TABS)[number];

const BADGE_CONFIG: Record<
  string,
  { label: string; emoji: string }
> = {
  phone_verified: { label: "Phone Verified", emoji: "\u{260E}" },
  email_verified: { label: "Email Verified", emoji: "\u{2709}" },
  id_verified: { label: "ID Verified", emoji: "\u{1FAAA}" },
  background_checked: { label: "Background Checked", emoji: "\u{1F6E1}" },
  business_registered: { label: "Registered Business", emoji: "\u{1F3E2}" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProviderProfileClient({
  providerId,
}: {
  providerId: string;
}) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [badges, setBadges] = useState<VerificationBadge[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("About");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch provider
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    Promise.all([
      apiGet<Provider>(`/api/profiles/${providerId}`).catch(() => null),
      apiGet<VerificationBadge[]>(
        `/api/verification/badges/${providerId}`,
      ).catch(() => []),
    ])
      .then(([providerData, badgesData]) => {
        if (!providerData) {
          setError("Provider not found");
        } else {
          setProvider(providerData);
          setBadges(badgesData ?? []);
        }
      })
      .finally(() => setIsLoading(false));
  }, [providerId]);

  // Fetch reviews lazily
  useEffect(() => {
    if (activeTab !== "Reviews") return;
    apiGet<Record<string, unknown>>(`/api/reviews/user/${providerId}`)
      .then((data) => {
        const items = (data.reviews ??
          data.items ??
          data ??
          []) as Review[];
        setReviews(Array.isArray(items) ? items : []);
      })
      .catch(() => setReviews([]));
  }, [activeTab, providerId]);

  // Fetch portfolio lazily
  useEffect(() => {
    if (activeTab !== "Portfolio") return;
    apiGet<Record<string, unknown>>(
      `/api/profiles/${providerId}/portfolio`,
    )
      .then((data) => {
        const items = (data.items ?? data ?? []) as PortfolioItem[];
        setPortfolio(Array.isArray(items) ? items : []);
      })
      .catch(() => setPortfolio([]));
  }, [activeTab, providerId]);

  function getRating(): number {
    return provider?.rating ?? provider?.average_rating ?? 0;
  }

  function getReviewCount(): number {
    return provider?.review_count ?? provider?.total_reviews ?? 0;
  }

  const services: Service[] = provider?.services ?? [];

  // Loading
  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-primary" />
        <p className="mt-3 text-sm text-neutral-500">
          Loading provider profile...
        </p>
      </main>
    );
  }

  // Error
  if (error || !provider) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 text-5xl">{"\u{1F464}"}</div>
        <h2 className="text-lg font-medium text-neutral-900">
          Provider not found
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          {error ?? "This provider profile could not be loaded."}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link
            href="/search"
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Browse Providers
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Back link */}
      <Link
        href="/search"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
      >
        &larr; Back to search
      </Link>

      {/* Provider header */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-brand-primary/10">
            <span className="text-3xl font-bold text-brand-primary">
              {provider.display_name?.charAt(0) ?? "?"}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-neutral-900">
                    {provider.display_name}
                  </h1>
                  {provider.is_verified && (
                    <span title="Verified" aria-label="Verified provider">
                      {"\u2705"}
                    </span>
                  )}
                </div>

                {provider.category && (
                  <span className="mt-1 inline-block rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-sm font-medium text-brand-primary">
                    {provider.category}
                  </span>
                )}

                {provider.parish && (
                  <p className="mt-2 flex items-center gap-1 text-sm text-neutral-500">
                    {"\u{1F4CD}"} {provider.parish}
                  </p>
                )}

                {/* Verification badges */}
                {badges.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {badges.map((badge) => {
                      const config = BADGE_CONFIG[badge.badge_type];
                      if (!config) return null;
                      return (
                        <span
                          key={badge.id}
                          className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700"
                          title={config.label}
                        >
                          {config.emoji} {config.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="shrink-0 text-right">
                <div className="flex items-center gap-1">
                  <span className="text-brand-accent">{"\u{2B50}"}</span>
                  <span className="text-xl font-bold">
                    {getRating().toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-neutral-500">
                  {getReviewCount()}{" "}
                  {getReviewCount() === 1 ? "review" : "reviews"}
                </p>
              </div>
            </div>

            {provider.bio && (
              <p className="mt-3 text-sm text-neutral-600">{provider.bio}</p>
            )}

            {/* Skills */}
            {provider.skills && provider.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {provider.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/bookings?provider_id=${provider.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Book Now
              </Link>
              <Link
                href={`/messages?provider=${providerId}`}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Message
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <div className="flex gap-0 overflow-x-auto" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              className={`whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition ${
                activeTab === tab
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        {/* About */}
        {activeTab === "About" && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-neutral-900">
                About
              </h2>
              <p className="text-sm leading-relaxed text-neutral-600">
                {provider.bio ?? "This provider has not added a bio yet."}
              </p>
            </div>

            {services.length > 0 && (
              <div>
                <h3 className="mb-3 font-semibold text-neutral-900">
                  Services
                </h3>
                <div className="space-y-2">
                  {services.map((svc, i) => (
                    <div
                      key={svc.id ?? i}
                      className="flex items-center justify-between border-b border-neutral-100 py-2 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {svc.name}
                        </p>
                        {svc.description && (
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {svc.description}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {svc.price != null && (
                          <p className="text-sm font-semibold text-neutral-900">
                            J${svc.price.toLocaleString()}
                          </p>
                        )}
                        {svc.duration && (
                          <p className="text-xs text-neutral-500">
                            {svc.duration}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            <div>
              <h3 className="mb-3 font-semibold text-neutral-900">Details</h3>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {provider.category && (
                  <div>
                    <dt className="text-neutral-500">Category</dt>
                    <dd className="font-medium text-neutral-900">
                      {provider.category}
                    </dd>
                  </div>
                )}
                {provider.parish && (
                  <div>
                    <dt className="text-neutral-500">Parish</dt>
                    <dd className="font-medium text-neutral-900">
                      {provider.parish}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-neutral-500">Verified</dt>
                  <dd className="font-medium text-neutral-900">
                    {provider.is_verified ? "Yes" : "No"}
                  </dd>
                </div>
                {provider.created_at && (
                  <div>
                    <dt className="text-neutral-500">Member since</dt>
                    <dd className="font-medium text-neutral-900">
                      {new Date(provider.created_at).toLocaleDateString(
                        "en-JM",
                        { year: "numeric", month: "long" },
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {/* Portfolio */}
        {activeTab === "Portfolio" && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              Portfolio
            </h2>
            {portfolio.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {portfolio.map((item, i) => (
                  <div
                    key={item.id ?? i}
                    className="overflow-hidden rounded-lg border border-neutral-200"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-48 items-center justify-center bg-neutral-100 text-4xl text-neutral-300">
                        {"\u{1F5BC}"}
                      </div>
                    )}
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-neutral-900">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="text-4xl text-neutral-300">{"\u{1F5BC}"}</div>
                <p className="mt-3 text-sm text-neutral-500">
                  No portfolio items yet
                </p>
              </div>
            )}
          </div>
        )}

        {/* Services */}
        {activeTab === "Services" && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              Services
            </h2>
            {services.length > 0 ? (
              <div className="space-y-3">
                {services.map((svc, i) => (
                  <div
                    key={svc.id ?? i}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 transition hover:border-brand-primary/30"
                  >
                    <div>
                      <h3 className="text-sm font-medium text-neutral-900">
                        {svc.name}
                      </h3>
                      {svc.description && (
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {svc.description}
                        </p>
                      )}
                      {svc.duration && (
                        <p className="mt-0.5 text-xs text-neutral-400">
                          {svc.duration}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {svc.price != null && (
                        <p className="font-semibold text-neutral-900">
                          J${svc.price.toLocaleString()}
                        </p>
                      )}
                      <Link
                        href={`/bookings?provider_id=${provider.id}`}
                        className="text-sm font-medium text-brand-primary hover:underline"
                      >
                        Book &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="text-4xl text-neutral-300">{"\u{1F4BC}"}</div>
                <p className="mt-3 text-sm text-neutral-500">
                  No services listed yet
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reviews */}
        {activeTab === "Reviews" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">
                Reviews
              </h2>
              <div className="flex items-center gap-1 text-sm text-neutral-500">
                <span className="text-brand-accent">{"\u{2B50}"}</span>
                <span className="font-medium text-neutral-900">
                  {getRating().toFixed(1)}
                </span>
                <span>
                  ({getReviewCount()}{" "}
                  {getReviewCount() === 1 ? "review" : "reviews"})
                </span>
              </div>
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border-b border-neutral-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                          {(
                            review.reviewer_display_name ??
                            review.reviewer_name ??
                            "A"
                          ).charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            {review.reviewer_display_name ??
                              review.reviewer_name ??
                              "Anonymous"}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {new Date(review.created_at).toLocaleDateString(
                              "en-JM",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={
                              i < review.rating
                                ? "text-brand-accent"
                                : "text-neutral-200"
                            }
                          >
                            {"\u{2B50}"}
                          </span>
                        ))}
                      </div>
                    </div>
                    {(review.comment ?? review.text) && (
                      <p className="mt-2 text-sm text-neutral-600">
                        {review.comment ?? review.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="text-4xl text-neutral-300">{"\u{2B50}"}</div>
                <p className="mt-3 text-sm text-neutral-500">No reviews yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
