import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { apiGet } from '../lib/api'
import ProviderLevelBadge from '../components/ProviderLevelBadge'
import {
  Search, Star, MapPin, ShieldCheck, Loader2, Filter, ChevronDown, ChevronLeft, ChevronRight,
  X, User, DollarSign, Clock, SlidersHorizontal,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatJMD(amount: number): string {
  return `J$${amount.toLocaleString('en-JM')}`
}

const CATEGORY_COLORS: Record<string, string> = {
  plumbing: 'from-blue-400 to-blue-600',
  electrical: 'from-yellow-400 to-orange-500',
  cleaning: 'from-teal-400 to-cyan-600',
  beauty: 'from-pink-400 to-rose-600',
  carpentry: 'from-orange-400 to-amber-600',
  painting: 'from-purple-400 to-violet-600',
  landscaping: 'from-green-400 to-emerald-600',
  'auto repair': 'from-red-400 to-red-600',
  construction: 'from-stone-400 to-stone-600',
  catering: 'from-orange-300 to-amber-500',
  photography: 'from-indigo-400 to-blue-600',
  tutoring: 'from-sky-400 to-blue-600',
}

function getCategoryGradient(cat?: string): string {
  const key = (cat ?? '').toLowerCase()
  for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
    if (key.includes(k)) return v
  }
  return 'from-emerald-400 to-green-600'
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
  { value: 'rating_desc', label: 'Rating (High to Low)' },
  { value: 'price_asc', label: 'Price (Low to High)' },
  { value: 'price_desc', label: 'Price (High to Low)' },
  { value: 'reviews', label: 'Most Reviews' },
  { value: 'newest', label: 'Newest' },
]

const RATING_OPTIONS = [
  { value: 0, label: 'Any Rating' },
  { value: 3, label: '3+ Stars' },
  { value: 4, label: '4+ Stars' },
  { value: 4.5, label: '4.5+ Stars' },
]

const LEVEL_OPTIONS = [
  { value: 0, label: 'All Levels' },
  { value: 2, label: 'Rising' },
  { value: 3, label: 'Established' },
  { value: 4, label: 'Expert' },
  { value: 5, label: 'Elite' },
]

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'Any Availability' },
  { value: 'now', label: 'Available Now' },
  { value: 'week', label: 'Available This Week' },
]

const PAGE_SIZE = 20

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
  id: string
  display_name: string
  avatar_url?: string
  category: string
  parish: string
  rating?: number
  average_rating?: number
  rating_avg?: number
  review_count?: number
  total_reviews?: number
  rating_count?: number
  skills?: string[]
  is_verified?: boolean
  background_checked?: boolean
  bio?: string
  starting_price?: number
  level?: number
  level_name?: string
  availability?: string
}

interface Suggestion {
  text: string
  type: 'trending' | 'recent' | 'category'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SearchPage() {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // State from URL params
  const initialQ = searchParams.get('q') || ''
  const initialCategories = searchParams.get('category')?.split(',').filter(Boolean) || []
  const initialParishes = searchParams.get('parish')?.split(',').filter(Boolean) || []

  const [query, setQuery] = useState(initialQ)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories)
  const [selectedParishes, setSelectedParishes] = useState<string[]>(initialParishes)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [minRating, setMinRating] = useState(0)
  const [idVerified, setIdVerified] = useState(false)
  const [backgroundChecked, setBackgroundChecked] = useState(false)
  const [providerLevel, setProviderLevel] = useState(0)
  const [availability, setAvailability] = useState('')
  const [sort, setSort] = useState('relevance')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Sync state when URL params change (e.g. from Layout search bar)
  useEffect(() => {
    const urlQ = searchParams.get('q') || ''
    const urlCategory = searchParams.get('category')?.split(',').filter(Boolean) || []
    const urlParish = searchParams.get('parish')?.split(',').filter(Boolean) || []
    setQuery(urlQ)
    if (urlCategory.length) setSelectedCategories(urlCategory)
    if (urlParish.length) setSelectedParishes(urlParish)
    setPage(1)
  }, [searchParams])

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Build API query string
  const buildApiParams = useCallback((): string => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (selectedCategories.length) params.set('category', selectedCategories.join(','))
    if (selectedParishes.length) params.set('parish', selectedParishes.join(','))
    if (priceMin) params.set('price_min', priceMin)
    if (priceMax) params.set('price_max', priceMax)
    if (minRating > 0) params.set('min_rating', String(minRating))
    if (idVerified) params.set('verified', 'true')
    if (backgroundChecked) params.set('background_checked', 'true')
    if (providerLevel > 0) params.set('level', String(providerLevel))
    if (availability) params.set('availability', availability)
    if (sort && sort !== 'relevance') params.set('sort', sort)
    params.set('page', String(page))
    params.set('limit', String(PAGE_SIZE))
    return params.toString()
  }, [query, selectedCategories, selectedParishes, priceMin, priceMax, minRating, idVerified, backgroundChecked, providerLevel, availability, sort, page])

  const apiQueryString = buildApiParams()

  // Search suggestions
  const { data: suggestionsData } = useQuery<Suggestion[]>({
    queryKey: ['search-suggestions', query],
    queryFn: () => apiGet(`/api/search/suggest?q=${encodeURIComponent(query.trim())}`, token),
    enabled: !!token && query.trim().length >= 2 && showSuggestions,
    staleTime: 10_000,
  })
  const suggestions: Suggestion[] = suggestionsData || []

  // Main search
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['search', apiQueryString],
    queryFn: () => apiGet(`/api/search/profiles?${apiQueryString}`, token),
    enabled: !!token,
  })

  const results: SearchResult[] = data?.hits || data?.items || data?.results || []
  const totalResults: number = data?.total ?? data?.total_count ?? results.length
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE))
  const showingFrom = results.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0
  const showingTo = Math.min(page * PAGE_SIZE, totalResults)

  // Handlers
  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setShowSuggestions(false)
    setPage(1)
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (selectedCategories.length) params.set('category', selectedCategories.join(','))
    if (selectedParishes.length) params.set('parish', selectedParishes.join(','))
    setSearchParams(params)
  }

  function selectSuggestion(text: string) {
    setQuery(text)
    setShowSuggestions(false)
    setPage(1)
    setSearchParams({ q: text })
  }

  function toggleCategory(cat: string) {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
    setPage(1)
  }

  function toggleParish(p: string) {
    setSelectedParishes(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
    setPage(1)
  }

  function clearFilters() {
    setSelectedCategories([])
    setSelectedParishes([])
    setPriceMin('')
    setPriceMax('')
    setMinRating(0)
    setIdVerified(false)
    setBackgroundChecked(false)
    setProviderLevel(0)
    setAvailability('')
    setSort('relevance')
    setPage(1)
    setSearchParams(query.trim() ? { q: query.trim() } : {})
  }

  function getRating(item: SearchResult): number {
    return item.average_rating ?? item.rating ?? item.rating_avg ?? 0
  }

  function getReviewCount(item: SearchResult): number {
    return item.review_count ?? item.total_reviews ?? item.rating_count ?? 0
  }

  const activeFilterCount = [
    selectedCategories.length > 0,
    selectedParishes.length > 0,
    !!priceMin || !!priceMax,
    minRating > 0,
    idVerified,
    backgroundChecked,
    providerLevel > 0,
    !!availability,
    sort !== 'relevance',
  ].filter(Boolean).length

  const hasActiveFilters = activeFilterCount > 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Service Providers</h1>
        <p className="text-gray-600 mt-1">Search for skilled professionals across Jamaica</p>
      </div>

      {/* Search Bar with Autocomplete */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              if (e.target.value.trim().length >= 2) setShowSuggestions(true)
              else setShowSuggestions(false)
            }}
            onFocus={() => { if (query.trim().length >= 2) setShowSuggestions(true) }}
            placeholder="Search by name, skill, or service..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-30 max-h-64 overflow-y-auto"
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectSuggestion(s.text)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition"
                >
                  {s.type === 'trending' && <TrendingIcon />}
                  {s.type === 'recent' && <Clock className="h-4 w-4 text-gray-400 shrink-0" />}
                  {s.type === 'category' && <Search className="h-4 w-4 text-gray-400 shrink-0" />}
                  <span className="truncate">{s.text}</span>
                  {s.type === 'trending' && (
                    <span className="ml-auto text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                      Trending
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
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
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-sm text-primary hover:underline flex items-center gap-1">
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Category Multi-Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                      selectedCategories.includes(c)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Parish Multi-Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parish</label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {PARISHES.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleParish(p)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                      selectedParishes.includes(p)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range (JMD)</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="number"
                    value={priceMin}
                    onChange={e => { setPriceMin(e.target.value); setPage(1) }}
                    placeholder="Min"
                    min="0"
                    className="w-full pl-7 pr-2 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <span className="text-gray-400 text-sm">to</span>
                <div className="relative flex-1">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="number"
                    value={priceMax}
                    onChange={e => { setPriceMax(e.target.value); setPage(1) }}
                    placeholder="Max"
                    min="0"
                    className="w-full pl-7 pr-2 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
              <div className="relative">
                <select
                  value={minRating}
                  onChange={e => { setMinRating(Number(e.target.value)); setPage(1) }}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {RATING_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Provider Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider Level</label>
              <div className="relative">
                <select
                  value={providerLevel}
                  onChange={e => { setProviderLevel(Number(e.target.value)); setPage(1) }}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {LEVEL_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Availability Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
              <div className="relative">
                <select
                  value={availability}
                  onChange={e => { setAvailability(e.target.value); setPage(1) }}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {AVAILABILITY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Verification Badges */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Verification</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={idVerified}
                    onChange={e => { setIdVerified(e.target.checked); setPage(1) }}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm text-gray-700">ID Verified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={backgroundChecked}
                    onChange={e => { setBackgroundChecked(e.target.checked); setPage(1) }}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">Background Checked</span>
                </label>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <div className="relative">
                <select
                  value={sort}
                  onChange={e => { setSort(e.target.value); setPage(1) }}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map(c => (
            <span key={`cat-${c}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
              {c}
              <button onClick={() => toggleCategory(c)} className="hover:text-primary/70"><X className="h-3 w-3" /></button>
            </span>
          ))}
          {selectedParishes.map(p => (
            <span key={`par-${p}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">
              <MapPin className="h-3 w-3" />
              {p}
              <button onClick={() => toggleParish(p)} className="hover:text-blue-500"><X className="h-3 w-3" /></button>
            </span>
          ))}
          {(priceMin || priceMax) && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
              ${priceMin || '0'} - ${priceMax || 'Any'}
              <button onClick={() => { setPriceMin(''); setPriceMax('') }} className="hover:text-green-500"><X className="h-3 w-3" /></button>
            </span>
          )}
          {minRating > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm">
              <Star className="h-3 w-3 fill-yellow-500" />
              {minRating}+ Stars
              <button onClick={() => setMinRating(0)} className="hover:text-yellow-500"><X className="h-3 w-3" /></button>
            </span>
          )}
          {idVerified && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
              <ShieldCheck className="h-3 w-3" />
              ID Verified
              <button onClick={() => setIdVerified(false)} className="hover:text-primary/70"><X className="h-3 w-3" /></button>
            </span>
          )}
          {backgroundChecked && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
              <ShieldCheck className="h-3 w-3" />
              Background Checked
              <button onClick={() => setBackgroundChecked(false)} className="hover:text-green-500"><X className="h-3 w-3" /></button>
            </span>
          )}
          {providerLevel > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm">
              Level {providerLevel}+
              <button onClick={() => setProviderLevel(0)} className="hover:text-purple-500"><X className="h-3 w-3" /></button>
            </span>
          )}
          {availability && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm">
              <Clock className="h-3 w-3" />
              {availability === 'now' ? 'Available Now' : 'Available This Week'}
              <button onClick={() => setAvailability('')} className="hover:text-emerald-500"><X className="h-3 w-3" /></button>
            </span>
          )}
          {sort !== 'relevance' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
              Sort: {SORT_OPTIONS.find(o => o.value === sort)?.label}
              <button onClick={() => setSort('relevance')} className="hover:text-gray-500"><X className="h-3 w-3" /></button>
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

      {/* Results Count & Sort Bar */}
      {!isLoading && !isError && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-gray-600">
            {totalResults > 0 ? (
              <>
                Showing <span className="font-medium">{showingFrom}-{showingTo}</span> of{' '}
                <span className="font-medium">{totalResults}</span> {totalResults === 1 ? 'provider' : 'providers'}
                {query.trim() && <> for "<span className="font-medium">{query.trim()}</span>"</>}
              </>
            ) : (
              <>
                {results.length} {results.length === 1 ? 'provider' : 'providers'} found
                {query.trim() && <> for "<span className="font-medium">{query.trim()}</span>"</>}
              </>
            )}
          </p>

          {/* Inline Sort (desktop) */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-gray-500">Sort:</span>
            <div className="relative">
              <select
                value={sort}
                onChange={e => { setSort(e.target.value); setPage(1) }}
                className="appearance-none px-3 py-1.5 pr-7 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && !isError && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map(item => {
            const rating = getRating(item)
            const reviewCount = getReviewCount(item)
            const gradient = getCategoryGradient(item.category)
            const isNew = reviewCount === 0
            return (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 hover:shadow-lg hover:border-[#059669]/30 transition overflow-hidden group"
            >
              {/* Gradient banner */}
              <div className={`h-20 bg-gradient-to-br ${gradient} relative flex items-end px-4 pb-2`}>
                {/* Avatar */}
                <div className="absolute -bottom-5 left-4 h-12 w-12 rounded-full border-2 border-white shadow-md bg-white">
                  {item.avatar_url ? (
                    <img src={item.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <div className={`h-full w-full rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
                {/* New / Featured badge */}
                {isNew && (
                  <span className="absolute top-2 right-2 bg-[#D97706] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    New
                  </span>
                )}
              </div>

              <div className="p-4 pt-7">
                {/* Name + Verified */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">
                    {item.display_name}
                  </h3>
                  {item.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-[#059669] shrink-0" aria-label="ID Verified" />}
                  {item.background_checked && <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-label="Background Checked" />}
                </div>

                {item.level && item.level > 0 && (
                  <div className="mt-0.5">
                    <ProviderLevelBadge level={item.level} size="sm" />
                  </div>
                )}

                {/* Category + Parish */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {item.category && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                      {item.category}
                    </span>
                  )}
                  {item.parish && (
                    <span className="flex items-center gap-0.5 text-gray-500 text-xs">
                      <MapPin className="h-3 w-3" />
                      {item.parish}
                    </span>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1">
                    {isNew ? (
                      <span className="text-xs text-gray-400 italic">No reviews yet</span>
                    ) : (
                      <>
                        <Star className="h-3.5 w-3.5 text-[#D97706] fill-[#D97706]" />
                        <span className="font-semibold text-sm">{rating.toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({reviewCount})</span>
                      </>
                    )}
                  </div>
                  {item.starting_price != null && (
                    <span className="text-sm font-bold text-[#059669]">
                      {formatJMD(item.starting_price)}
                    </span>
                  )}
                </div>

                {/* Skills */}
                {Array.isArray(item.skills) && item.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {item.skills.slice(0, 3).map(skill => (
                      <span key={skill} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                        {skill}
                      </span>
                    ))}
                    {item.skills.length > 3 && (
                      <span className="px-2 py-0.5 text-gray-400 text-[10px]">
                        +{item.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* View Profile Button */}
              <Link
                to={`/provider/${item.id}`}
                className="block text-center py-2.5 border-t border-gray-100 text-[#059669] text-sm font-semibold hover:bg-emerald-50 transition"
              >
                View Profile →
              </Link>
            </div>
          )})}

        </div>
      )}

      {/* Pagination */}
      {!isLoading && !isError && results.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`h-9 w-9 rounded-lg text-sm font-medium transition ${
                    page === pageNum
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
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
            <button onClick={clearFilters} className="mt-4 text-primary font-medium text-sm hover:underline">
              Clear all filters
            </button>
          )}
          <div className="mt-8">
            <p className="text-sm text-gray-500 mb-3">Popular categories:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Plumbing', 'Electrical', 'Cleaning', 'Beauty', 'Carpentry'].map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategories([cat])
                    setPage(1)
                  }}
                  className="px-3 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 hover:border-primary hover:text-primary transition"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Small trending icon component
function TrendingIcon() {
  return (
    <svg className="h-4 w-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}
