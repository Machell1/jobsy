import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiGet, apiPost, apiDelete, ApiError } from '../lib/api'
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Ticket,
  Share2,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Minus,
  Plus,
  Megaphone,
  User,
  DollarSign,
  AlertCircle,
} from 'lucide-react'

interface EventDetail {
  id: string
  organizer_id: string
  title: string
  description: string | null
  category: string | null
  cover_image_url: string | null
  cover_video_url: string | null
  start_date: string
  end_date: string | null
  location_text: string | null
  parish: string | null
  is_free: boolean
  ticket_price: number | null
  currency: string
  capacity: number | null
  age_restriction: string | null
  is_featured: boolean
  status: string
  rsvp_count: number
  ticket_sold_count: number
  view_count: number
  tags: string[]
  created_at: string
  updated_at: string
}

interface EventUpdateItem {
  id: string
  event_id: string
  author_id: string
  content: string
  created_at: string
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [ticketQty, setTicketQty] = useState(1)

  // Fetch event
  const { data: event, isLoading } = useQuery<EventDetail>({
    queryKey: ['event', id],
    queryFn: () => apiGet(`/api/events/${id}`),
    enabled: !!id,
  })

  // Fetch updates
  const { data: updates = [] } = useQuery<EventUpdateItem[]>({
    queryKey: ['event-updates', id],
    queryFn: () => apiGet(`/api/events/${id}/updates`),
    enabled: !!id,
  })

  // RSVP mutation
  const rsvpMutation = useMutation({
    mutationFn: () => apiPost(`/api/events/${id}/rsvp`, { status: 'going' }, token),
    onSuccess: () => {
      toast({ title: 'RSVP confirmed!' })
      queryClient.invalidateQueries({ queryKey: ['event', id] })
    },
    onError: (err: ApiError) => toast({ title: err.detail || 'Failed to RSVP', variant: 'destructive' }),
  })

  // Cancel RSVP mutation
  const cancelRsvpMutation = useMutation({
    mutationFn: () => apiDelete(`/api/events/${id}/rsvp`, token),
    onSuccess: () => {
      toast({ title: 'RSVP cancelled' })
      queryClient.invalidateQueries({ queryKey: ['event', id] })
    },
    onError: (err: ApiError) => toast({ title: err.detail || 'Failed to cancel RSVP', variant: 'destructive' }),
  })

  // Buy tickets mutation
  const buyTicketsMutation = useMutation({
    mutationFn: () => apiPost(`/api/events/${id}/tickets`, { quantity: ticketQty }, token),
    onSuccess: () => {
      toast({ title: `${ticketQty} ticket(s) purchased!` })
      queryClient.invalidateQueries({ queryKey: ['event', id] })
    },
    onError: (err: ApiError) => toast({ title: err.detail || 'Failed to purchase tickets', variant: 'destructive' }),
  })

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: event?.title, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({ title: 'Link copied to clipboard' })
    }
  }

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-JM', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  }

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-JM', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const isOrganizer = user && event && user.id === event.organizer_id

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-medium text-gray-700">Event not found</h2>
        <Link to="/events" className="text-primary text-sm mt-2 inline-block hover:underline">Back to events</Link>
      </div>
    )
  }

  const remaining = event.capacity ? event.capacity - (event.rsvp_count + event.ticket_sold_count) : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back nav */}
      <button onClick={() => navigate('/events')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition">
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </button>

      {/* Cover */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-gold/20 h-64 sm:h-80">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
        ) : event.cover_video_url ? (
          <video src={event.cover_video_url} className="w-full h-full object-cover" controls />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="h-20 w-20 text-primary/20" />
          </div>
        )}
        {/* Status badge */}
        {event.status === 'cancelled' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">CANCELLED</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          {event.is_free ? (
            <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full shadow">FREE</span>
          ) : (
            <span className="px-3 py-1 bg-gold text-primary-dark text-sm font-bold rounded-full shadow">
              ${event.ticket_price?.toLocaleString()} {event.currency}
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{event.title}</h1>
            {event.category && (
              <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {event.category}
              </span>
            )}
          </div>

          {/* Date & location info */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{formatDateTime(event.start_date)}</p>
                {event.end_date && (
                  <p className="text-xs text-gray-500">to {formatDateTime(event.end_date)}</p>
                )}
              </div>
            </div>
            {event.location_text && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{event.location_text}</p>
                  {event.parish && <p className="text-xs text-gray-500">{event.parish}</p>}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm text-gray-700">
                {event.rsvp_count + event.ticket_sold_count} attending
                {remaining !== null && remaining > 0 && (
                  <span className="text-gray-400"> &middot; {remaining} spots left</span>
                )}
              </p>
            </div>
            {event.age_restriction && (
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
                <p className="text-sm text-orange-600 font-medium">Age Restriction: {event.age_restriction}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-2">About this event</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag, i) => (
                <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">#{tag}</span>
              ))}
            </div>
          )}

          {/* Updates */}
          {updates.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Event Updates
              </h2>
              <div className="space-y-3">
                {updates.map(u => (
                  <div key={u.id} className="border-l-2 border-primary/30 pl-3">
                    <p className="text-sm text-gray-700">{u.content}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatShortDate(u.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Action Card */}
        <div className="space-y-4">
          {/* RSVP / Tickets Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 sticky top-24">
            {event.status === 'cancelled' ? (
              <p className="text-center text-red-600 font-medium">This event has been cancelled</p>
            ) : event.is_free ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Free Event</h3>
                <p className="text-sm text-gray-500">RSVP to let the organizer know you're coming</p>
                <button
                  onClick={() => rsvpMutation.mutate()}
                  disabled={rsvpMutation.isPending || !token}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition disabled:opacity-50"
                >
                  {rsvpMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  RSVP - I'm Going
                </button>
                {!token && (
                  <p className="text-xs text-center text-gray-400">
                    <Link to="/login" className="text-primary hover:underline">Sign in</Link> to RSVP
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Get Tickets</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Price per ticket</span>
                  <span className="font-bold text-lg text-gray-900">
                    ${event.ticket_price?.toLocaleString()} <span className="text-xs text-gray-400">{event.currency}</span>
                  </span>
                </div>
                {/* Quantity selector */}
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-2">
                  <span className="text-sm text-gray-600 pl-2">Quantity</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setTicketQty(Math.max(1, ticketQty - 1))}
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-medium text-lg w-8 text-center">{ticketQty}</span>
                    <button
                      onClick={() => setTicketQty(Math.min(20, ticketQty + 1))}
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-bold text-primary">
                    ${((event.ticket_price || 0) * ticketQty).toLocaleString()} {event.currency}
                  </span>
                </div>
                <button
                  onClick={() => buyTicketsMutation.mutate()}
                  disabled={buyTicketsMutation.isPending || !token}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gold text-primary-dark rounded-lg font-bold hover:bg-gold-dark transition disabled:opacity-50"
                >
                  {buyTicketsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ticket className="h-4 w-4" />
                  )}
                  Buy Tickets
                </button>
                {!token && (
                  <p className="text-xs text-center text-gray-400">
                    <Link to="/login" className="text-primary hover:underline">Sign in</Link> to buy tickets
                  </p>
                )}
              </div>
            )}

            {/* Share */}
            <button
              onClick={handleShare}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              <Share2 className="h-4 w-4" />
              Share Event
            </button>

            {/* Organizer dashboard link */}
            {isOrganizer && (
              <Link
                to={`/events/${event.id}/dashboard`}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition"
              >
                <DollarSign className="h-4 w-4" />
                Organizer Dashboard
              </Link>
            )}
          </div>

          {/* Organizer info */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Organized by</h3>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-gray-900">{event.organizer_id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
