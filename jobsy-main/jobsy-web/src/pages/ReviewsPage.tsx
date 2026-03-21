import { useAuth } from '../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import {
  Star,
  Loader2,
  MessageSquare,
  TrendingUp,
  Award,
  ThumbsUp,
} from 'lucide-react'

interface Review {
  id: string
  reviewer_name?: string
  reviewer_id?: string
  rating: number
  comment?: string
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
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Star className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500">See what others are saying about you</p>
        </div>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
