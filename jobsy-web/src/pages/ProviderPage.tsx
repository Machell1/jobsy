import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiGet, apiPost, apiDelete, ApiError } from '../lib/api'
import {
  Star, MapPin, ShieldCheck, Loader2, MessageSquare, Calendar, Share2,
  Heart, ChevronRight, Briefcase, User, Image, Clock, ArrowLeft,
} from 'lucide-react'

const TABS = ['About', 'Portfolio', 'Services', 'Reviews'] as const
type Tab = (typeof TABS)[number]

interface Provider {
  id: string
  display_name: string
  bio?: string
  category?: string
  parish?: string
  rating?: number
  average_rating?: number
  review_count?: number
  total_reviews?: number
  is_verified?: boolean
  skills?: string[]
  services?: Service[]
  portfolio?: PortfolioItem[]
  phone?: string
  email?: string
  created_at?: string
}

interface Service {
  id?: string
  name: string
  description?: string
  price?: number
  duration?: string
}

interface PortfolioItem {
  id?: string
  title: string
  description?: string
  image_url?: string
  created_at?: string
}

interface Review {
  id: string
  reviewer_name?: string
  reviewer_display_name?: string
  rating: number
  comment?: string
  text?: string
  created_at: string
}

export default function ProviderPage() {
  const { id } = useParams<{ id: string }>()
  const { token, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<Tab>('About')
  const [isFollowing, setIsFollowing] = useState(false)

  // Fetch provider profile
  const {
    data: provider,
    isLoading,
    isError,
    error,
  } = useQuery<Provider>({
    queryKey: ['provider', id],
    queryFn: () => apiGet(`/api/profiles/${id}`, token),
    enabled: !!token && !!id,
  })

  // Fetch reviews for the Reviews tab
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['provider-reviews', id],
    queryFn: () => apiGet(`/api/reviews/user/${id}`, token),
    enabled: !!token && !!id && activeTab === 'Reviews',
  })

  // Fetch portfolio for Portfolio tab
  const { data: portfolioData } = useQuery({
    queryKey: ['provider-portfolio', id],
    queryFn: () => apiGet(`/api/profiles/${id}/portfolio`, token).catch(() => null),
    enabled: !!token && !!id && activeTab === 'Portfolio',
  })

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: () => {
      if (isFollowing) {
        return apiDelete(`/api/follows/${id}`, token)
      }
      return apiPost('/api/follows', { following_id: id }, token)
    },
    onSuccess: () => {
      setIsFollowing(!isFollowing)
      toast({
        title: isFollowing ? 'Unfollowed' : 'Following',
        description: isFollowing
          ? `You unfollowed ${provider?.display_name || 'this provider'}`
          : `You are now following ${provider?.display_name || 'this provider'}`,
      })
    },
    onError: (err) => {
      toast({
        title: 'Error',
        description: err instanceof ApiError ? err.detail : 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  function handleShare() {
    const url = window.location.href
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        toast({ title: 'Link copied', description: 'Provider link copied to clipboard' })
      }).catch(() => {
        toast({ title: 'Share', description: url })
      })
    } else {
      toast({ title: 'Share', description: url })
    }
  }

  function getRating(): number {
    return provider?.rating ?? provider?.average_rating ?? 0
  }

  function getReviewCount(): number {
    return provider?.review_count ?? provider?.total_reviews ?? 0
  }

  const reviews: Review[] = reviewsData?.reviews || reviewsData?.items || reviewsData || []
  const portfolio: PortfolioItem[] =
    portfolioData?.items || portfolioData || provider?.portfolio || []
  const services: Service[] = provider?.services || []

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-gray-500 text-sm">Loading provider profile...</p>
      </div>
    )
  }

  // Error state
  if (isError || !provider) {
    return (
      <div className="text-center py-24">
        <User className="h-12 w-12 text-gray-300 mx-auto" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Provider not found</h3>
        <p className="mt-2 text-gray-500 text-sm">
          {error instanceof Error ? error.message : 'This provider profile could not be loaded.'}
        </p>
        <button
          onClick={() => navigate('/search')}
          className="mt-4 text-primary font-medium text-sm hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Provider Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-12 w-12 text-primary" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {provider.display_name}
                  </h1>
                  {provider.is_verified && (
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  )}
                </div>

                {provider.category && (
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {provider.category}
                  </span>
                )}

                {provider.parish && (
                  <div className="flex items-center gap-1 mt-2 text-gray-500 text-sm">
                    <MapPin className="h-4 w-4" />
                    {provider.parish}
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-xl font-bold">{getRating().toFixed(1)}</span>
                </div>
                <p className="text-sm text-gray-500">
                  {getReviewCount()} {getReviewCount() === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </div>

            {provider.bio && (
              <p className="mt-3 text-gray-600 text-sm">{provider.bio}</p>
            )}

            {/* Skills */}
            {provider.skills && provider.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {provider.skills.map(skill => (
                  <span
                    key={skill}
                    className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              {/* CRITICAL FIX: Book Now passes provider_id in URL */}
              <Link
                to={`/bookings?provider_id=${provider.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition text-sm"
              >
                <Calendar className="h-4 w-4" />
                Book Now
              </Link>

              <Link
                to="/messages"
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-sm"
              >
                <MessageSquare className="h-4 w-4" />
                Message
              </Link>

              <button
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition text-sm ${
                  isFollowing
                    ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFollowing ? 'fill-red-500 text-red-500' : ''}`} />
                {followMutation.isPending ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
              </button>

              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-sm"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* About Tab */}
        {activeTab === 'About' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {provider.bio || 'This provider has not added a bio yet.'}
              </p>
            </div>

            {services.length > 0 && (
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-3">Services</h3>
                <div className="space-y-2">
                  {services.map((svc, i) => (
                    <div key={svc.id || i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{svc.name}</p>
                        {svc.description && (
                          <p className="text-gray-500 text-xs mt-0.5">{svc.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {svc.price != null && (
                          <p className="font-semibold text-gray-900 text-sm">
                            ${svc.price.toLocaleString()}
                          </p>
                        )}
                        {svc.duration && (
                          <p className="text-gray-500 text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {svc.duration}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {provider.skills && provider.skills.length > 0 && (
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {provider.skills.map(skill => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-3">Details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {provider.category && (
                  <div>
                    <dt className="text-gray-500">Category</dt>
                    <dd className="font-medium text-gray-900">{provider.category}</dd>
                  </div>
                )}
                {provider.parish && (
                  <div>
                    <dt className="text-gray-500">Parish</dt>
                    <dd className="font-medium text-gray-900">{provider.parish}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500">Verified</dt>
                  <dd className="font-medium text-gray-900">
                    {provider.is_verified ? 'Yes' : 'No'}
                  </dd>
                </div>
                {provider.created_at && (
                  <div>
                    <dt className="text-gray-500">Member since</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(provider.created_at).toLocaleDateString('en-JM', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'Portfolio' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Portfolio</h2>
            {portfolio.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolio.map((item, i) => (
                  <div
                    key={item.id || i}
                    className="rounded-lg border border-gray-200 overflow-hidden"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                        <Image className="h-10 w-10 text-gray-300" />
                      </div>
                    )}
                    <div className="p-3">
                      <h3 className="font-medium text-gray-900 text-sm">{item.title}</h3>
                      {item.description && (
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Image className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="mt-3 text-gray-500 text-sm">No portfolio items yet</p>
              </div>
            )}
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'Services' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Services</h2>
            {services.length > 0 ? (
              <div className="space-y-3">
                {services.map((svc, i) => (
                  <div
                    key={svc.id || i}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-primary/30 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 text-sm">{svc.name}</h3>
                        {svc.description && (
                          <p className="text-gray-500 text-xs mt-0.5">{svc.description}</p>
                        )}
                        {svc.duration && (
                          <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {svc.duration}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {svc.price != null && (
                        <p className="font-semibold text-gray-900">
                          ${svc.price.toLocaleString()}
                        </p>
                      )}
                      <Link
                        to={`/bookings?provider_id=${provider.id}`}
                        className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
                      >
                        Book
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="mt-3 text-gray-500 text-sm">No services listed yet</p>
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'Reviews' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-medium text-gray-900">{getRating().toFixed(1)}</span>
                <span>({getReviewCount()} {getReviewCount() === 1 ? 'review' : 'reviews'})</span>
              </div>
            </div>

            {reviewsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div
                    key={review.id}
                    className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {review.reviewer_display_name || review.reviewer_name || 'Anonymous'}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {new Date(review.created_at).toLocaleDateString('en-JM', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < review.rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {(review.comment || review.text) && (
                      <p className="mt-2 text-gray-600 text-sm">
                        {review.comment || review.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Star className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="mt-3 text-gray-500 text-sm">No reviews yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
