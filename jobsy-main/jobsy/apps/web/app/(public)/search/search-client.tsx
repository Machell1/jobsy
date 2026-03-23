"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PARISHES, SERVICE_CATEGORIES } from "@jobsy/config";
import { apiGet } from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = SERVICE_CATEGORIES.map((c) => c.label);

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "rating_desc", label: "Rating (High to Low)" },
  { value: "price_asc", label: "Price (Low to High)" },
  { value: "price_desc", label: "Price (High to Low)" },
  { value: "reviews", label: "Most Reviews" },
  { value: "newest", label: "Newest" },
];

const RATING_OPTIONS = [
  { value: 0, label: "Any Rating" },
  { value: 3, label: "3+ Stars" },
  { value: 4, label: "4+ Stars" },
  { value: 4.5, label: "4.5+ Stars" },
];

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
  id: string;
  display_name: string;
  avatar_url?: string;
  category: string;
  parish: string;
  rating?: number;
  average_rating?: number;
  review_count?: number;
  total_reviews?: number;
  skills?: string[];
  is_verified?: boolean;
  starting_price?: number;
  level?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SearchPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const initialCategory =
    searchParams
      .get("category")
      ?.split(",")
      .filter(Boolean) ?? [];
  const initialParish =
    searchParams
      .get("parish")
      ?.split(",")
      .filter(Boolean) ?? [];

  const [query, setQuery] = useState(initialQ);
  const [selectedCategories, setSelectedCategories] =
    useState<string[]>(initialCategory);
  const [selectedParishes, setSelectedParishes] =
    useState<string[]>(initialParish);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [idVerified, setIdVerified] = useState(false);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync URL params
  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    const urlCat =
      searchParams
        .get("category")
        ?.split(",")
        .filter(Boolean) ?? [];
    const urlPar =
      searchParams
        .get("parish")
        ?.split(",")
        .filter(Boolean) ?? [];
    setQuery(urlQ);
    if (urlCat.length) setSelectedCategories(urlCat);
    if (urlPar.length) setSelectedParishes(urlPar);
    setPage(1);
  }, [searchParams]);

  // Build API params
  const buildApiParams = useCallback((): string => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedCategories.length)
      params.set("category", selectedCategories.join(","));
    if (selectedParishes.length)
      params.set("parish", selectedParishes.join(","));
    if (minRating > 0) params.set("min_rating", String(minRating));
    if (idVerified) params.set("verified", "true");
    if (sort !== "relevance") params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    return params.toString();
  }, [query, selectedCategories, selectedParishes, minRating, idVerified, sort, page]);

  // Fetch results
  useEffect(() => {
    const qs = buildApiParams();
    setIsLoading(true);
    setError(null);

    apiGet<Record<string, unknown>>(`/api/search/profiles?${qs}`)
      .then((data) => {
        const hits = (data.hits ?? data.items ?? data.results ?? []) as SearchResult[];
        setResults(hits);
        setTotalResults(
          (data.total as number) ?? (data.total_count as number) ?? hits.length,
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load results");
        setResults([]);
      })
      .finally(() => setIsLoading(false));
  }, [buildApiParams]);

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedCategories.length)
      params.set("category", selectedCategories.join(","));
    if (selectedParishes.length)
      params.set("parish", selectedParishes.join(","));
    router.push(`/search?${params.toString()}`);
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
    setPage(1);
  }

  function toggleParish(p: string) {
    setSelectedParishes((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
    setPage(1);
  }

  function clearFilters() {
    setSelectedCategories([]);
    setSelectedParishes([]);
    setMinRating(0);
    setIdVerified(false);
    setSort("relevance");
    setPage(1);
  }

  function getRating(item: SearchResult): number {
    return item.average_rating ?? item.rating ?? 0;
  }

  function getReviewCount(item: SearchResult): number {
    return item.review_count ?? item.total_reviews ?? 0;
  }

  const activeFilterCount = [
    selectedCategories.length > 0,
    selectedParishes.length > 0,
    minRating > 0,
    idVerified,
    sort !== "relevance",
  ].filter(Boolean).length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Find Service Providers
        </h1>
        <p className="mt-1 text-neutral-500">
          Search for skilled professionals across Jamaica
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, skill, or service..."
            className="w-full rounded-lg border border-neutral-300 py-3 pl-10 pr-4 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            aria-label="Search query"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-brand-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition ${
            activeFilterCount > 0
              ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
              : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          }`}
          aria-expanded={showFilters}
        >
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-xs text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="space-y-5 rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900">Filters</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-brand-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {/* Categories */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Category
              </label>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      selectedCategories.includes(c)
                        ? "border-brand-primary bg-brand-primary text-white"
                        : "border-neutral-300 bg-white text-neutral-600 hover:border-brand-primary hover:text-brand-primary"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Parishes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Parish
              </label>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {PARISHES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleParish(p)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      selectedParishes.includes(p)
                        ? "border-brand-primary bg-brand-primary text-white"
                        : "border-neutral-300 bg-white text-neutral-600 hover:border-brand-primary hover:text-brand-primary"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Minimum Rating
              </label>
              <select
                value={minRating}
                onChange={(e) => {
                  setMinRating(Number(e.target.value));
                  setPage(1);
                }}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                {RATING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Verification */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Verification
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={idVerified}
                  onChange={(e) => {
                    setIdVerified(e.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 rounded border-neutral-300 text-brand-primary focus:ring-brand-primary"
                />
                <span className="text-sm text-neutral-700">ID Verified</span>
              </label>
            </div>

            {/* Sort */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Sort By
              </label>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      {!isLoading && !error && (
        <p className="text-sm text-neutral-600">
          {totalResults > 0 ? (
            <>
              Showing{" "}
              <span className="font-medium">
                {Math.min((page - 1) * PAGE_SIZE + 1, totalResults)}-
                {Math.min(page * PAGE_SIZE, totalResults)}
              </span>{" "}
              of <span className="font-medium">{totalResults}</span> providers
              {query.trim() && (
                <>
                  {" "}
                  for &ldquo;
                  <span className="font-medium">{query.trim()}</span>&rdquo;
                </>
              )}
            </>
          ) : (
            "0 providers found"
          )}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-primary" />
          <p className="mt-3 text-sm text-neutral-500">
            Searching providers...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-error/30 bg-red-50 p-4 text-center">
          <p className="font-medium text-error">
            Failed to load search results
          </p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Results grid */}
      {!isLoading && !error && results.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:border-brand-primary/30 hover:shadow-md"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-primary/10">
                    {item.avatar_url ? (
                      <img
                        src={item.avatar_url}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-brand-primary">
                        {item.display_name?.charAt(0) ?? "?"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-sm font-semibold text-neutral-900">
                        {item.display_name}
                      </h3>
                      {item.is_verified && (
                        <span
                          className="text-brand-primary"
                          title="Verified"
                          aria-label="Verified provider"
                        >
                          {"\u2705"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.category && (
                    <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-medium text-brand-primary">
                      {item.category}
                    </span>
                  )}
                  {item.parish && (
                    <span className="flex items-center gap-0.5 text-xs text-neutral-500">
                      {"\u{1F4CD}"} {item.parish}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-brand-accent">{"\u{2B50}"}</span>
                    <span className="font-semibold">
                      {getRating(item).toFixed(1)}
                    </span>
                    <span className="text-xs text-neutral-500">
                      ({getReviewCount(item)})
                    </span>
                  </div>
                  {item.starting_price != null && (
                    <span className="text-sm font-semibold text-neutral-900">
                      J${item.starting_price.toLocaleString()}
                    </span>
                  )}
                </div>

                {item.skills && item.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {item.skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600"
                      >
                        {skill}
                      </span>
                    ))}
                    {item.skills.length > 4 && (
                      <span className="px-2 py-0.5 text-[10px] text-neutral-400">
                        +{item.skills.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Link
                href={`/provider/${item.id}`}
                className="block border-t border-neutral-100 py-2.5 text-center text-sm font-medium text-brand-primary transition hover:bg-brand-primary/5"
              >
                View Profile
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && results.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-neutral-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && results.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 text-5xl">{"\u{1F50D}"}</div>
          <h3 className="text-lg font-medium text-neutral-900">
            No providers found
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
            {query.trim()
              ? `We couldn't find any providers matching "${query.trim()}". Try adjusting your search or filters.`
              : "Try searching for a service or provider name, or browse by category."}
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm font-medium text-brand-primary hover:underline"
            >
              Clear all filters
            </button>
          )}
          <div className="mt-8">
            <p className="mb-3 text-sm text-neutral-500">
              Popular categories:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Plumbing", "Electrical", "Cleaning", "Beauty", "Carpentry"].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategories([cat]);
                      setPage(1);
                    }}
                    className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition hover:border-brand-primary hover:text-brand-primary"
                  >
                    {cat}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
