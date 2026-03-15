import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { apiGet } from '../lib/api'
import {
  Search, Star, MapPin, ShieldCheck, Loader2, Filter, ChevronDown, X,
} from 'lucide-react'

const CATEGORIES = [
  'Plumbing', 'Electrical', 'Cleaning', 'Beauty', 'Carpentry',
  'Painting', 'Landscaping', 'Auto Repair', 'General', 'Other',
]

const PARISHES = [
  'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary',
  'St. Ann', 'Trelawny', 'St. James', 'Hanover', 'Westmoreland',
  'St. Elizabeth', 'Manchester', 'Clarendon', 'St. Catherine',
]

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Highest Rating' },
  { value: 'reviews', label: 'Most Reviews' },
]

interface SearchResult {
  id: string
  display_name: string
  category: string
  parish: string
  rating?: number
  average_rating?: number
  review_count?: number
  total_reviews?: number
  skills?: string[]
  is_verified?: boolean
  bio?: string
}

export default function SearchPage() {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // CRITICAL FIX: Initialize state FROM URL params
  const initialQ = searchParams.get('q') || ''
  const initialCategory = searchParams.get('category') || ''
  const initialParish = searchParams.get('parish') || ''

  const [query, setQuery] = useState(initialQ)
  const [category, setCategory] = useState(initialCategory)
  const [parish, setParish] = useState(initialParish)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [sort, setSort] = useState('relevance')
  const [showFilters, setShowFilters] = useState(false)

  // Sync state when URL params change (e.g. from Layout search bar)
  useEffect(() => {
    const urlQ = searchParams.get('q') || ''
    const urlCategory = searchParams.get('category') || ''
    const urlParish = searchParams.get('parish') || ''
    setQuery(urlQ)
    if (urlCategory) setCategory(urlCategory)
    if (urlParish) setParish(urlParish)
  }, [searchParams])

  // Build API query string from current filters
  function buildApiParams(): string {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category) params.set('category', category)
    if (parish) params.set('parish', parish)
    if (verifiedOnly) params.set('verified', 'true')
    if (sort && sort !== 'relevance') params.set('sort', sort)
    return params.toString()
  }

  const apiQueryString = buildApiParams()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['search', apiQueryString],
    queryFn: () => apiGet(`/api/search/profiles?${apiQueryString}`, token),
    enabled: !!token,
  })

  const results: SearchResult[] = data?.hits || data?.items || data?.results || []

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    // Update URL params to reflect current filters
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category) params.set('category', category)
    if (parish) params.set('parish', parish)
    setSearchParams(params)
  }

  function clearFilters() {
    setCategory('')
    setParish('')
    setVerifiedOnly(false)
    setSort('relevance')
    setSearchParams(query.trim() ? { q: query.trim() } : {})
  }

  function getRating(item: SearchResult): number {
    return item.rating ?? item.average_rating ?? 0
  }

  function getReviewCount(item: SearchResult): number {
    return item.review_count ?? item.total_reviews ?? 0
  }

  const hasActiveFilters = !!category || !!parish || verifiedOnly || sort !== 'relevance'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Service Providers</h1>
        <p className="text-gray-600 mt-1">Search for skilled professionals across Jamaica</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, skill, or service..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition text-sm shrink-0"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-lg border font-medium transition text-sm shrink-0 flex items-center gap-2 ${
            hasActiveFilters
              ? 'bg-primary/10 border-primary text-primary'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {[category, parish, verifiedOnly, sort !== 'relevance'].filter(Boolean).length}
            </span>
          )}
        </button>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Parish Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parish</label>
              <div className="relative">
                <select
                  value={parish}
                  onChange={e => setParish(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                >
                  <option value="">All Parishes</option>
                  {PARISHES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <div className="relative">
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Verified Toggle */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={e => setVerifiedOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm text-gray-700">Verified only</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {category && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
              {category}
              <button onClick={() => setCategory('')} className="hover:text-primary/70">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {parish && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
              {parish}
              <button onClick={() => setParish('')} className="hover:text-primary/70">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {verifiedOnly && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
              Verified
              <button onClick={() => setVerifiedOnly(false)} className="hover:text-primary/70">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-gray-500 text-sm">Searching providers...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-800 font-medium">Failed to load search results</p>
          <p className="text-red-600 text-sm mt-1">
            {error instanceof Error ? error.message : 'Please try again later.'}
          </p>
        </div>
      )}

      {/* Results Count */}
      {!isLoading && !isError && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {results.length} {results.length === 1 ? 'provider' : 'providers'} found
            {query.trim() && <> for "<span className="font-medium">{query.trim()}</span>"</>}
          </p>
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && !isError && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results
            .filter(item => !verifiedOnly || item.is_verified)
            .sort((a, b) => {
              if (sort === 'rating') return getRating(b) - getRating(a)
              if (sort === 'reviews') return getReviewCount(b) - getReviewCount(a)
              return 0 // relevance = API default order
            })
            .map(item => (
              <Link
                key={item.id}
                to={`/provider/${item.id}`}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-primary/30 transition block"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {item.display_name}
                      </h3>
                      {item.is_verified && (
                        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>

                    {item.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {item.category}
                      </span>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold text-sm">
                        {getRating(item).toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {getReviewCount(item)} {getReviewCount(item) === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                </div>

                {/* Parish */}
                {item.parish && (
                  <div className="flex items-center gap-1 mt-2 text-gray-500 text-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    {item.parish}
                  </div>
                )}

                {/* Bio */}
                {item.bio && (
                  <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                    {item.bio}
                  </p>
                )}

                {/* Skills */}
                {item.skills && item.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {item.skills.slice(0, 4).map(skill => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                    {item.skills.length > 4 && (
                      <span className="px-2 py-0.5 text-gray-400 text-xs">
                        +{item.skills.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && results.length === 0 && (
        <div className="text-center py-16">
          <Search className="h-12 w-12 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No providers found</h3>
          <p className="mt-2 text-gray-500 text-sm max-w-md mx-auto">
            {query.trim()
              ? `We couldn't find any providers matching "${query.trim()}". Try adjusting your search or filters.`
              : 'Try searching for a service or provider name, or browse by category.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-primary font-medium text-sm hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
