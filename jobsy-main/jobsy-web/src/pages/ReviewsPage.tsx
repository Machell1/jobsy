import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, ApiError } from '../lib/api'
import ImageUpload from '../components/ImageUpload'
import {
  Star,
  Loader2,
  MessageSquare,
  TrendingUp,
  Award,
  ThumbsUp,
  X,
  PenLine,
  Reply,
} from 'lucide-react'

interface Review {
  id: string
  reviewer_name?: string
  reviewer_id?: string
  rating: number
  comment?: string
  photo_url?: string
  response?: string
  response_date?: string
  created_at?: string
  date?: string
}

interface Reputation {
  average_rating?: number
  total_reviews?: number
  rating_distribution?: Record<string, number>
  response_rate?: number
  completion_rate?: number
}

interface Booking {
  id: string
  title?: string
  provider_name?: string
  service_name?: string
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i <= rating ? 'text-gold fill-gold' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

function ClickableStarRating({
  rating,
  onChange,
}: {
  rating: number
  onChange: (r: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-0.5"
        >
          <Star
            className={`h-7 w-7 transition ${
              i <= (hover || rating)
                ? 'text-gold fill-gold'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function ReviewsPage() {
  const { token, user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [showWriteModal, setShowWriteModal] = useState(false)
  const [showRespondModal, setShowRespondModal] = useState<string | null>(null)
  const [writeForm, setWriteForm] = useState({
    rating: 0,
    comment: '',
    photo_url: '',
    booking_id: '',
  })
  const [respondText, setRespondText] = useState('')

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ['reviews', user?.id],
    queryFn: async () => {
      const data = await apiGet(`/api/reviews/user/${user?.id}`, token)
      return Array.isArray(data) ? data : data?.items || data?.reviews || []
    },
    enabled: !!token && !!user?.id,
  })

  const { data: reputation } = useQuery<Reputation>({
    queryKey: ['reputation', user?.id],
    queryFn: () => apiGet(`/api/reviews/reputation/${user?.id}`, token),
    enabled: !!token && !!user?.id,
  })

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ['bookings-for-review'],
    queryFn: async () => {
      const data = await apiGet('/api/bookings/', token)
      return Array.isArray(data) ? data : data?.items || data?.bookings || []
    },
    enabled: !!token && showWriteModal,
  })

  const createReviewMutation = useMutation({
    mutationFn: (data: typeof writeForm) =>
      apiPost('/api/reviews', data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      queryClient.invalidateQueries({ queryKey: ['reputation'] })
      toast({ title: 'Review submitted successfully' })
      setShowWriteModal(false)
      setWriteForm({ rating: 0, comment: '', photo_url: '', booking_id: '' })
    },
    onError: (error: unknown) => {
      const detail =
        error instanceof ApiError
          ? error.detail
          : error instanceof Error
            ? error.message
            : 'Failed to submit review'
      toast({ title: 'Failed to submit review', description: detail, variant: 'destructive' })
    },
  })

  const respondToReviewMutation = useMutation({
    mutationFn: ({ reviewId, response }: { reviewId: string; response: string }) =>
      apiPost(`/api/reviews/${reviewId}/respond`, { response }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      toast({ title: 'Response posted successfully' })
      setShowRespondModal(null)
      setRespondText('')
    },
    onError: (error: unknown) => {
      const detail =
        error instanceof ApiError
          ? error.detail
          : error instanceof Error
            ? error.message
            : 'Failed to post response'
      toast({ title: 'Failed to post response', description: detail, variant: 'destructive' })
    },
  })

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (!writeForm.booking_id) {
      toast({ title: 'Please select a booking', variant: 'destructive' })
      return
    }
    if (writeForm.rating === 0) {
      toast({ title: 'Please select a rating', variant: 'destructive' })
      return
    }
    if (!writeForm.comment.trim()) {
      toast({ title: 'Please write a review', variant: 'destructive' })
      return
    }
    createReviewMutation.mutate(writeForm)
  }

  const handleSubmitResponse = (e: React.FormEvent) => {
    e.preventDefault()
    if (!respondText.trim()) {
      toast({ title: 'Please enter a response', variant: 'destructive' })
      return
    }
    if (showRespondModal) {
      respondToReviewMutation.mutate({ reviewId: showRespondModal, response: respondText })
    }
  }

  if (reviewsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Star className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
            <p className="text-sm text-gray-500">See what others are saying about you</p>
          </div>
        </div>
        <button
          onClick={() => setShowWriteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
        >
          <PenLine className="h-4 w-4" />
          Write a Review
        </button>
      </div>

      {/* Reputation Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-green-700 p-6 text-white">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className="text-4xl font-bold">
                {reputation?.average_rating?.toFixed(1) || '0.0'}
              </div>
              <StarRating rating={Math.round(reputation?.average_rating || 0)} size="lg" />
              <p className="text-sm text-white/80 mt-1">
                {reputation?.total_reviews || reviews.length} review{(reputation?.total_reviews || reviews.length) !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-1" />
                <p className="text-sm font-medium">{reputation?.response_rate ?? '--'}%</p>
                <p className="text-xs text-white/70">Response Rate</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <Award className="h-5 w-5 mx-auto mb-1" />
                <p className="text-sm font-medium">{reputation?.completion_rate ?? '--'}%</p>
                <p className="text-xs text-white/70">Completion</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <ThumbsUp className="h-5 w-5 mx-auto mb-1" />
                <p className="text-sm font-medium">{reputation?.total_reviews || reviews.length}</p>
                <p className="text-xs text-white/70">Total Reviews</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        {reputation?.rating_distribution && (
          <div className="px-6 py-4 space-y-2">
            {[5, 4, 3, 2, 1].map(star => {
              const count = reputation.rating_distribution?.[String(star)] || 0
              const total = reputation.total_reviews || 1
              const percentage = Math.round((count / total) * 100)
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-4">{star}</span>
                  <Star className="h-3.5 w-3.5 text-gold fill-gold" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No reviews yet</h3>
          <p className="text-sm text-gray-500">
            Reviews from your clients will appear here once you receive them.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {(review.reviewer_name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {review.reviewer_name || 'Anonymous'}
                    </p>
                    <StarRating rating={review.rating} />
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDate(review.created_at || review.date)}
                </span>
              </div>
              {review.comment && (
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">{review.comment}</p>
              )}
              {review.photo_url && (
                <img
                  src={review.photo_url}
                  alt="Review photo"
                  className="mt-3 rounded-lg max-h-48 object-cover"
                />
              )}

              {/* Provider response */}
              {review.response && (
                <div className="mt-4 ml-6 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Provider Response</p>
                  <p className="text-sm text-gray-700">{review.response}</p>
                  {review.response_date && (
                    <p className="text-xs text-gray-400 mt-1">{formatDate(review.response_date)}</p>
                  )}
                </div>
              )}

              {/* Respond button (for providers) */}
              {!review.response && review.reviewer_id !== user?.id && (
                <button
                  onClick={() => {
                    setShowRespondModal(review.id)
                    setRespondText('')
                  }}
                  className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:text-green-700 font-medium transition"
                >
                  <Reply className="h-4 w-4" />
                  Respond
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Write Review Modal */}
      {showWriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Write a Review</h2>
              <button
                onClick={() => setShowWriteModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmitReview} className="p-6 space-y-5">
              {/* Booking selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Booking / Job
                </label>
                <select
                  value={writeForm.booking_id}
                  onChange={e => setWriteForm(f => ({ ...f, booking_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm bg-white"
                >
                  <option value="">Select a booking...</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.title || b.service_name || b.provider_name || b.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Star rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Rating
                </label>
                <ClickableStarRating
                  rating={writeForm.rating}
                  onChange={r => setWriteForm(f => ({ ...f, rating: r }))}
                />
              </div>

              {/* Review text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Your Review
                </label>
                <textarea
                  value={writeForm.comment}
                  onChange={e => setWriteForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder="Share your experience..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm resize-none"
                />
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Photo <span className="text-gray-400">(optional)</span>
                </label>
                <ImageUpload
                  folder="reviews"
                  label="Add a photo"
                  currentImage={writeForm.photo_url || undefined}
                  onUpload={(url) => setWriteForm(f => ({ ...f, photo_url: url }))}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={createReviewMutation.isPending}
                className="w-full bg-primary hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                {createReviewMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Respond to Review Modal */}
      {showRespondModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Respond to Review</h2>
              <button
                onClick={() => setShowRespondModal(null)}
                className="p-1 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmitResponse} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Your Response
                </label>
                <textarea
                  value={respondText}
                  onChange={e => setRespondText(e.target.value)}
                  placeholder="Write your response..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={respondToReviewMutation.isPending}
                className="w-full bg-primary hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                {respondToReviewMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Response'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
