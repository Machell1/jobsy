import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SEO from '../components/SEO'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { apiGet } from '../lib/api'
import {
  Calendar,
  MapPin,
  Search,
  Plus,
  Clock,
  Sparkles,
  Filter,
  Loader2,
  Tag,
  Users,
} from 'lucide-react'

interface EventItem {
  id: string
  title: string
  description: string | null
  category: string | null
  cover_image_url: string | null
  start_date: string
  end_date: string | null
  location_text: string | null
  parish: string | null
  is_free: boolean
  ticket_price: number | null
  currency: string
  capacity: number | null
  rsvp_count: number
  ticket_sold_count: number
  status: string
  is_featured: boolean
  tags: string[]
}

const PARISHES = [
  'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary',
  'St. Ann', 'Trelawny', 'St. James', 'Hanover', 'Westmoreland',
  'St. Elizabeth', 'Manchester', 'Clarendon', 'St. Catherine',
]

const CATEGORIES = [
  'Music & Concerts', 'Food & Drink', 'Arts & Culture', 'Sports & Fitness',
  'Business & Networking', 'Community', 'Education', 'Nightlife & Parties',
  'Family & Kids', 'Health & Wellness', 'Religion & Spirituality', 'Other',
]

type QuickFilter = 'all' | 'happening-now' | 'this-weekend' | 'featured'

export default function EventsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [parish, setParish] = useState('')
  const [category, setCategory] = useState('')
  const [freeOnly, setFreeOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Build query params
  const buildParams = () => {
    const params = new URLSearchParams()
    if (parish) params.set('parish', parish)
    if (category) params.set('category', category)
    if (freeOnly) params.set('is_free', 'true')
    if (searchQuery) params.set('q', searchQuery)
    return params.toString()
  }

  // Standard listing
  const { data: listData, isLoading: listLoading } = useQuery<{ events: EventItem[]; total: number }>({
    queryKey: ['events', 'list', parish, category, freeOnly, searchQuery],
    queryFn: () => {
      const qs = buildParams()
      return apiGet(`/api/events${qs ? `?${qs}` : ''}`)
    },
    enabled: quickFilter === 'all',
  })

  // Featured
  const { data: featuredData, isLoading: featuredLoading } = useQuery<EventItem[]>({
    queryKey: ['events', 'featured'],
    queryFn: () => apiGet('/api/events/featured'),
    enabled: quickFilter === 'featured',
  })

  // Happening now
  const { data: happeningData, isLoading: happeningLoading } = useQuery<EventItem[]>({
    queryKey: ['events', 'happening-now'],
    queryFn: () => apiGet('/api/events/happening-now'),
    enabled: quickFilter === 'happening-now',
  })

  // This weekend
  const { data: weekendData, isLoading: weekendLoading } = useQuery<EventItem[]>({
    queryKey: ['events', 'this-weekend'],
    queryFn: () => apiGet('/api/events/this-weekend'),
    enabled: quickFilter === 'this-weekend',
  })

  const isLoading = listLoading || featuredLoading || happeningLoading || weekendLoading

  const getEvents = (): EventItem[] => {
    switch (quickFilter) {
      case 'featured': return featuredData || []
      case 'happening-now': return happeningData || []
      case 'this-weekend': return weekendData || []
      default: return listData?.events || []
    }
  }

  const events = getEvents()

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-JM', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <SEO
        title="Pan di Ends — Events in Jamaica"
        description="Discover the best events happening across Jamaica. Concerts, food festivals, parties, and community gatherings — all in one place on Jobsy."
        url="https://jobsyja.com/#/events"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-7 w-7 text-primary" />
            Pan di Ends
          </h1>
          <p className="text-gray-500 text-sm mt-1">Discover events happening across Jamaica</p>
        </div>
        <Link
          to="/events/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition text-sm"
        >
          <Plus className="h-4 w-4" />
          Post Event
        </Link>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition ${
            showFilters ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Parish</label>
            <select
              value={parish}
              onChange={e => setParish(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Parishes</option>
              {PARISHES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={e => setFreeOnly(e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Free Only</span>
            </label>
          </div>
        </div>
      )}

      {/* Quick Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          { key: 'all' as QuickFilter, label: 'All Events', icon: Calendar },
          { key: 'happening-now' as QuickFilter, label: 'Happening Now', icon: Clock },
          { key: 'this-weekend' as QuickFilter, label: 'This Weekend', icon: Sparkles },
          { key: 'featured' as QuickFilter, label: 'Featured', icon: Tag },
        ]).map(f => (
          <button
            key={f.key}
            onClick={() => setQuickFilter(f.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              quickFilter === f.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <f.icon className="h-3.5 w-3.5" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && events.length === 0 && (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700">No events found</h3>
          <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or check back later</p>
          <Link
            to="/events/create"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition"
          >
            <Plus className="h-4 w-4" />
            Post an Event
          </Link>
        </div>
      )}

      {/* Event Grid */}
      {!isLoading && events.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(event => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition group"
            >
              {/* Cover Image */}
              <div className="relative h-44 bg-gradient-to-br from-primary/20 to-gold/20">
                {event.cover_image_url ? (
                  <img
                    src={event.cover_image_url}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Calendar className="h-12 w-12 text-primary/30" />
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  {event.is_free ? (
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">FREE</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gold text-primary-dark text-xs font-bold rounded-full">
                      ${event.ticket_price?.toLocaleString()} {event.currency}
                    </span>
                  )}
                  {event.is_featured && (
                    <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded-full">Featured</span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition">
                  {event.title}
                </h3>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatDate(event.start_date)}</span>
                  </div>
                  {event.location_text && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">{event.location_text}</span>
                    </div>
                  )}
                  {event.category && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Tag className="h-3.5 w-3.5 shrink-0" />
                      <span>{event.category}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Users className="h-3.5 w-3.5" />
                    <span>{(event.rsvp_count || 0) + (event.ticket_sold_count || 0)} attending</span>
                  </div>
                  {event.parish && (
                    <span className="text-xs text-gray-400">{event.parish}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
