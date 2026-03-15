import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiGet } from '../lib/api'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Calendar,
  MessageSquare,
  Megaphone,
  Settings,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react'

const quickActions = [
  { to: '/search', icon: Search, label: 'Search', description: 'Find services', color: 'bg-blue-100 text-blue-700' },
  { to: '/bookings', icon: Calendar, label: 'Bookings', description: 'Manage bookings', color: 'bg-green-100 text-green-700' },
  { to: '/messages', icon: MessageSquare, label: 'Messages', description: 'View messages', color: 'bg-purple-100 text-purple-700' },
  { to: '/noticeboard', icon: Megaphone, label: 'Noticeboard', description: 'Community posts', color: 'bg-orange-100 text-orange-700' },
  { to: '/settings', icon: Settings, label: 'Settings', description: 'Account settings', color: 'bg-gray-100 text-gray-700' },
]

interface DashboardStats {
  total_bookings?: number
  completed_bookings?: number
  pending_bookings?: number
  cancelled_bookings?: number
  average_rating?: number
  total_reviews?: number
  total_earnings?: number
}

interface TrendPoint {
  date: string
  bookings?: number
  revenue?: number
}

interface TrendsData {
  period: string
  data: TrendPoint[]
}

export default function DashboardPage() {
  const { user, token } = useAuth()
  const { toast } = useToast()

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiGet('/api/analytics/dashboard', token),
    enabled: !!token,
    retry: 1,
    staleTime: 60_000,
  })

  const {
    data: trends,
    isLoading: trendsLoading,
    error: trendsError,
  } = useQuery<TrendsData>({
    queryKey: ['dashboard-trends'],
    queryFn: () => apiGet('/api/analytics/trends?period=30d', token),
    enabled: !!token,
    retry: 1,
    staleTime: 60_000,
  })

  const statCards = stats
    ? [
        { label: 'Total Bookings', value: stats.total_bookings ?? 0, icon: Calendar, color: 'text-blue-600' },
        { label: 'Completed', value: stats.completed_bookings ?? 0, icon: CheckCircle, color: 'text-green-600' },
        { label: 'Pending', value: stats.pending_bookings ?? 0, icon: Clock, color: 'text-yellow-600' },
        { label: 'Cancelled', value: stats.cancelled_bookings ?? 0, icon: XCircle, color: 'text-red-600' },
        { label: 'Avg Rating', value: stats.average_rating?.toFixed(1) ?? '--', icon: Star, color: 'text-gold' },
        { label: 'Reviews', value: stats.total_reviews ?? 0, icon: Users, color: 'text-purple-600' },
      ]
    : []

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.display_name || 'there'}!
        </h1>
        <p className="text-gray-500 mt-1">
          Here's what's happening with your account
        </p>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickActions.map(action => (
            <Link
              key={action.to}
              to={action.to}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-primary/30 transition group"
            >
              <div className={`p-3 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="font-medium text-gray-800 text-sm">{action.label}</span>
              <span className="text-xs text-gray-500">{action.description}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Your Stats
        </h2>

        {statsLoading ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-gray-200">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-gray-500">Loading stats...</span>
          </div>
        ) : statsError ? (
          <div className="flex items-center gap-3 p-6 bg-white rounded-xl border border-gray-200">
            <AlertCircle className="h-5 w-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-sm text-gray-600">Unable to load dashboard stats.</p>
              <p className="text-xs text-gray-400 mt-1">The analytics data may not be available yet. Try again later.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards.map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-gray-500 truncate">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 30-Day Trends */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          30-Day Trends
        </h2>

        {trendsLoading ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-gray-200">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-gray-500">Loading trends...</span>
          </div>
        ) : trendsError ? (
          <div className="flex items-center gap-3 p-6 bg-white rounded-xl border border-gray-200">
            <AlertCircle className="h-5 w-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-sm text-gray-600">Unable to load trend data.</p>
              <p className="text-xs text-gray-400 mt-1">Trends will appear once you have booking activity.</p>
            </div>
          </div>
        ) : trends?.data && trends.data.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-3">
              {/* Simple trend visualization using bars */}
              <div className="flex items-end gap-1 h-40">
                {trends.data.map((point, idx) => {
                  const maxBookings = Math.max(...trends.data.map(p => p.bookings || 0), 1)
                  const height = ((point.bookings || 0) / maxBookings) * 100
                  return (
                    <div
                      key={idx}
                      className="flex-1 group relative"
                      title={`${point.date}: ${point.bookings || 0} bookings`}
                    >
                      <div
                        className="bg-primary/70 hover:bg-primary rounded-t transition-colors w-full"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{trends.data[0]?.date}</span>
                <span>{trends.data[trends.data.length - 1]?.date}</span>
              </div>
            </div>

            {/* Summary row */}
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">
                  Total bookings: {trends.data.reduce((sum, p) => sum + (p.bookings || 0), 0)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-600">
                  Period: {trends.period || '30 days'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <TrendingDown className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No trend data available yet.</p>
            <p className="text-gray-400 text-xs mt-1">Start booking services to see your activity trends.</p>
          </div>
        )}
      </section>
    </div>
  )
}
