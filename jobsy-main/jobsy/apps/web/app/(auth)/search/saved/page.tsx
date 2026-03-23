"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGet, apiDelete, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SavedSearchFilters {
  categories?: string[];
  parishes?: string[];
  min_rating?: number;
  verified?: boolean;
  available_today?: boolean;
  available_this_week?: boolean;
  sort?: string;
}

interface SavedSearch {
  id: string;
  query?: string;
  filters: SavedSearchFilters;
  created_at: string;
  result_count?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    apiGet<SavedSearch[] | { items?: SavedSearch[]; data?: SavedSearch[] }>(
      "/api/search/saved-searches",
    )
      .then((res) => {
        const items = Array.isArray(res)
          ? res
          : res.items ?? res.data ?? [];
        setSearches(items);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load saved searches",
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await apiDelete(`/api/search/saved-searches/${id}`);
      setSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      // show inline error briefly
      setError(
        err instanceof ApiError ? err.detail : "Failed to delete saved search",
      );
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeletingId(null);
    }
  }

  function buildSearchUrl(s: SavedSearch): string {
    const params = new URLSearchParams();
    if (s.query) params.set("q", s.query);
    if (s.filters.categories?.length)
      params.set("category", s.filters.categories.join(","));
    if (s.filters.parishes?.length)
      params.set("parish", s.filters.parishes.join(","));
    return `/search?${params.toString()}`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-JM", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function describeSearch(s: SavedSearch): string {
    const parts: string[] = [];
    if (s.query) parts.push(`"${s.query}"`);
    if (s.filters.categories?.length)
      parts.push(s.filters.categories.join(", "));
    if (s.filters.parishes?.length) parts.push(s.filters.parishes.join(", "));
    if (s.filters.available_today) parts.push("Available today");
    if (s.filters.available_this_week) parts.push("Available this week");
    if (s.filters.verified) parts.push("Verified only");
    if (s.filters.min_rating)
      parts.push(`${s.filters.min_rating}+ stars`);
    return parts.length > 0 ? parts.join(" \u00B7 ") : "All providers";
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Saved Searches
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Quickly re-run your previous searches
          </p>
        </div>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          New Search
        </Link>
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

      {/* List */}
      {!isLoading && searches.length > 0 && (
        <div className="space-y-3">
          {searches.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition hover:shadow-sm sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-900">
                  {describeSearch(s)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                  <span>Saved {formatDate(s.created_at)}</span>
                  {s.result_count != null && (
                    <span>{s.result_count} results</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={buildSearchUrl(s)}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                >
                  Run Search
                </Link>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-error transition hover:bg-red-50 disabled:opacity-50"
                  aria-label={`Delete saved search: ${describeSearch(s)}`}
                >
                  {deletingId === s.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && searches.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 text-5xl">{"\u{1F516}"}</div>
          <h3 className="text-lg font-medium text-neutral-900">
            No saved searches
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
            When you search for providers, click the &ldquo;Save Search&rdquo;
            button to save your search criteria for later.
          </p>
          <Link
            href="/search"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Start Searching
          </Link>
        </div>
      )}
    </main>
  );
}
