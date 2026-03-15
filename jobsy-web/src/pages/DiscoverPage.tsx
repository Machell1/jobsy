import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, ApiError } from '../lib/api'
import {
  Heart,
  X,
  Star,
  MapPin,
  Briefcase,
  Loader2,
  Users,
  RefreshCw,
} from 'lucide-react'

interface FeedProfile {
  id: string
  display_name?: string
  bio?: string
  category?: string
  parish?: string
  average_rating?: number
  avatar_url?: string
  services?: string[]
}

export default function DiscoverPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [animating, setAnimating] = useState<'left' | 'right' | null>(null)

  const { data, isLoading, isError, refetch } = useQuery<FeedProfile[]>({
    queryKey: ['swipe-feed'],
    queryFn: async () => {
      try {
        const result = await apiGet('/api/swipes/feed', token)
        return Array.isArray(result) ? result : result?.profiles || result?.items || []
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return []
        }
        throw error
      }
    },
    enabled: !!token,
  })

  const profiles = data || []
  const currentProfile = profiles[currentIndex]

  const swipeMutation = useMutation({
    mutationFn: ({ target_id, action }: { target_id: string; action: 'like' | 'skip' }) =>
      apiPost('/api/swipes/', { target_id, action }, token),
    onSuccess: (_data, variables) => {
      if (variables.action === 'like') {
        toast({ title: 'Liked!' })
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.detail : 'Something went wrong'
      toast({ title: 'Swipe failed', description: message, variant: 'destructive' })
    },
    onSettled: () => {
      setCurrentIndex(prev => prev + 1)
      setAnimating(null)
    },
  })

  const handleSwipe = (action: 'like' | 'skip') => {
    if (!currentProfile || swipeMutation.isPending) return
    setAnimating(action === 'like' ? 'right' : 'left')
    setTimeout(() => {
      swipeMutation.mutate({ target_id: currentProfile.id, action })
    }, 200)
  }

  const handleRefresh = () => {
    setCurrentIndex(0)
    queryClient.invalidateQueries({ queryKey: ['swipe-feed'] })
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
            <p className="text-sm text-gray-500">Find service providers near you</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          title="Refresh feed"
        >
          <RefreshCw className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Card Area */}
      {isError || !profiles.length || currentIndex >= profiles.length ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No more profiles</h3>
          <p className="text-sm text-gray-500 mb-4">
            {isError
              ? 'Unable to load profiles right now. Please try again later.'
              : "You've seen all available profiles. Check back later for new ones!"}
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Feed
          </button>
        </div>
      ) : (
        <>
          {/* Profile Card */}
          <div
            className={`bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-200 ${
              animating === 'left'
                ? '-translate-x-full opacity-0 rotate-[-10deg]'
                : animating === 'right'
                ? 'translate-x-full opacity-0 rotate-[10deg]'
                : ''
            }`}
          >
            {/* Avatar / Image Area */}
            <div className="bg-gradient-to-br from-primary/10 to-green-50 h-48 flex items-center justify-center relative">
              {currentProfile.avatar_url ? (
                <img
                  src={currentProfile.avatar_url}
                  alt={currentProfile.display_name || 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary">
                    {(currentProfile.display_name || 'U')[0].toUpperCase()}
                  </span>
                </div>
              )}
              {/* Card counter */}
              <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/30 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                {currentIndex + 1} / {profiles.length}
              </div>
            </div>

            {/* Profile Info */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {currentProfile.display_name || 'Service Provider'}
                </h2>
                {currentProfile.average_rating != null && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-gold fill-gold" />
                    <span className="text-sm font-medium text-gray-700">
                      {currentProfile.average_rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {currentProfile.category && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                    <Briefcase className="h-3 w-3" />
                    {currentProfile.category}
                  </span>
                )}
                {currentProfile.parish && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    <MapPin className="h-3 w-3" />
                    {currentProfile.parish}
                  </span>
                )}
              </div>

              {currentProfile.bio && (
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                  {currentProfile.bio}
                </p>
              )}

              {currentProfile.services && currentProfile.services.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {currentProfile.services.slice(0, 4).map(s => (
                    <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {s}
                    </span>
                  ))}
                  {currentProfile.services.length > 4 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                      +{currentProfile.services.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => handleSwipe('skip')}
              disabled={swipeMutation.isPending}
              className="w-16 h-16 rounded-full bg-white border-2 border-gray-200 shadow-md flex items-center justify-center hover:border-red-300 hover:bg-red-50 transition group disabled:opacity-50"
            >
              <X className="h-7 w-7 text-gray-400 group-hover:text-red-500 transition" />
            </button>
            <button
              onClick={() => handleSwipe('like')}
              disabled={swipeMutation.isPending}
              className="w-20 h-20 rounded-full bg-primary shadow-lg flex items-center justify-center hover:bg-green-700 transition disabled:opacity-50"
            >
              <Heart className="h-9 w-9 text-white" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
