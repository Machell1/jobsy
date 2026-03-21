import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import {
  Heart,
  Loader2,
  User,
  Star,
  MapPin,
  MessageSquare,
  Users,
} from 'lucide-react'

interface Match {
  id: string
  provider_id?: string
  target_id?: string
  provider_name?: string
  display_name?: string
  bio?: string
  category?: string
  parish?: string
  average_rating?: number
  avatar_url?: string
  matched_at?: string
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function MatchesPage() {
  const { token } = useAuth()

  const { data, isLoading, isError } = useQuery<Match[]>({
    queryKey: ['matches'],
    queryFn: async () => {
      const result = await apiGet('/api/matches/', token)
      return Array.isArray(result) ? result : result?.items || result?.matches || []
    },
    enabled: !!token,
  })

  const matches = data || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Heart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matches</h1>
          <p className="text-sm text-gray-500">
            {matches.length > 0
              ? `${matches.length} match${matches.length !== 1 ? 'es' : ''}`
              : 'Your matches will appear here'}
          </p>
        </div>
      </div>

      {/* Matches Grid */}
      {isError ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Unable to load matches right now</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No matches yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Start discovering and liking providers to get matches!
          </p>
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
          >
            <Heart className="h-4 w-4" />
            Discover Providers
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map(match => {
            const providerId = match.provider_id || match.target_id || match.id
            const name = match.provider_name || match.display_name || 'Provider'
            return (
              <Link
                key={match.id}
                to={`/provider/${providerId}`}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-primary/20 transition group"
              >
                <div className="bg-gradient-to-br from-primary/5 to-green-50 p-6 flex items-center justify-center">
                  {match.avatar_url ? (
                    <img
                      src={match.avatar_url}
                      alt={name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white border-2 border-gray-100 shadow-md flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-primary transition">
                    {name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {match.category && (
                      <span className="text-xs text-gray-500">{match.category}</span>
                    )}
                    {match.parish && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
                        <MapPin className="h-3 w-3" />
                        {match.parish}
                      </span>
                    )}
                  </div>
                  {match.average_rating != null && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star className="h-3.5 w-3.5 text-gold fill-gold" />
                      <span className="text-xs font-medium text-gray-600">
                        {match.average_rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {match.bio && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{match.bio}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    {match.matched_at && (
                      <span className="text-xs text-gray-400">
                        Matched {formatDate(match.matched_at)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                      <MessageSquare className="h-3 w-3" />
                      Message
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
