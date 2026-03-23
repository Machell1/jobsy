import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiGet, apiPost, ApiError } from '../lib/api'
import { useQuery, useMutation } from '@tanstack/react-query'
import ProviderLevelBadge from '../components/ProviderLevelBadge'
import VerificationProgress from '../components/VerificationProgress'
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
  Briefcase,
  DollarSign,
  FileText,
  Eye,
  EyeOff,
  MousePointerClick,
  Send,
  Zap,
  Bell,
  MapPin,
  Shield,
  ArrowRight,
  Plus,
  Target,
  Image,
  Gavel,
  Sparkles,
  Mail,
  X,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  total_bookings?: number
  completed_bookings?: number
  pending_bookings?: number
  cancelled_bookings?: number
  average_rating?: number
  total_reviews?: number
  total_earnings?: number
  // Hirer-specific
  posted_jobs?: number
  active_bids_received?: number
  active_contracts?: number
  // Provider-specific
  available_jobs?: number
  my_bids?: number
  earnings_this_month?: number
  // Advertiser-specific
  active_campaigns?: number
  total_impressions?: number
  total_clicks?: number
  ctr?: number
  total_spend?: number
}

interface TrendPoint {
  date: string
  bookings?: number
  revenue?: number
  earnings?: number
  [key: string]: string | number | undefined
}

interface TrendsData {
  period: string
  data: TrendPoint[]
}

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  created_at: string
}

interface NotificationSummary {
  unread_count: number
  recent: { id: string; title: string; body?: string; created_at: string; read: boolean }[]
}

interface MessageSummary {
  unread_count: number
  recent_threads: { id: string; participant_name: string; last_message: string; updated_at: string }[]
}

interface EventItem {
  id: string
  title: string
  start_date: string
  location_text: string | null
  parish: string | null
}

// ---------------------------------------------------------------------------
// Role label map
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  customer: 'Hirer',
  hirer: 'Hirer',
  provider: 'Provider',
  advertiser: 'Advertiser',
}

const ROLE_COLORS: Record<string, string> = {
  customer: 'bg-blue-100 text-blue-700',
  hirer: 'bg-blue-100 text-blue-700',
  provider: 'bg-green-100 text-green-700',
  advertiser: 'bg-purple-100 text-purple-700',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user, token, activeRole, roles, setActiveRole } = useAuth()
  const { toast } = useToast()

  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')

  const currentRole = activeRole || user?.active_role || 'customer'

  // Email verification mutations
  const resendVerificationMutation = useMutation({
    mutationFn: () => apiPost('/auth/resend-verification', {}, token),
    onSuccess: () => {
      toast({ title: 'Verification email sent', description: 'Check your inbox for the 6-digit code.' })
      setShowVerifyModal(true)
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.detail : 'Failed to send verification email'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    },
  })

  const verifyEmailMutation = useMutation({
    mutationFn: (code: string) => apiPost('/auth/verify-email', { code }, token),
    onSuccess: () => {
      toast({ title: 'Email verified successfully!' })
      setShowVerifyModal(false)
      setVerificationCode('')
      // Reload page to refresh user state
      window.location.reload()
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.detail : 'Invalid verification code'
      toast({ title: 'Verification failed', description: message, variant: 'destructive' })
    },
  })

  // Role switch mutation
  const switchRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      try {
        await apiPost('/auth/roles/switch', { role }, token)
      } catch {
        // In preview mode or when backend is unavailable, still allow local role switch
      }
      return role
    },
    onSuccess: (role) => {
      setActiveRole(role)
      sessionStorage.setItem('jobsy_role', role)
      toast({ title: `Switched to ${ROLE_LABELS[role] || role} view` })
    },
  })

  // Dashboard stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', currentRole],
    queryFn: () => apiGet(`/api/analytics/dashboard?role=${currentRole}`, token),
    enabled: !!token,
    retry: 1,
    staleTime: 60_000,
  })

  // Trends / Earnings
  const {
    data: trends,
    isLoading: trendsLoading,
    error: trendsError,
  } = useQuery<TrendsData>({
    queryKey: ['dashboard-trends', currentRole],
    queryFn: () => apiGet(`/api/analytics/trends?period=30d&role=${currentRole}`, token),
    enabled: !!token,
    retry: 1,
    staleTime: 60_000,
  })

  // Recent activity
  const { data: activity } = useQuery<ActivityItem[]>({
    queryKey: ['dashboard-activity', currentRole],
    queryFn: () => apiGet(`/api/analytics/activity?role=${currentRole}&limit=5`, token),
    enabled: !!token,
    retry: 1,
    staleTime: 60_000,
  })

  // Notifications summary
  const { data: notifications } = useQuery<NotificationSummary>({
    queryKey: ['notifications-summary'],
    queryFn: () => apiGet('/api/notifications?limit=5', token),
    enabled: !!token,
    retry: 1,
    staleTime: 30_000,
  })

  // Messages summary
  const { data: messages } = useQuery<MessageSummary>({
    queryKey: ['messages-summary'],
    queryFn: () => apiGet('/api/messages/summary', token),
    enabled: !!token,
    retry: 1,
    staleTime: 30_000,
  })

  // Upcoming events ("Pan di Ends")
  const { data: upcomingEvents } = useQuery<EventItem[]>({
    queryKey: ['upcoming-events'],
    queryFn: () => apiGet('/api/events?limit=4&upcoming=true', token),
    enabled: !!token,
    retry: 1,
    staleTime: 120_000,
  })

  // Provider level (only for provider role)
  const { data: levelData } = useQuery<{ level: number; level_name: string; points: number }>({
    queryKey: ['my-level'],
    queryFn: () => apiGet('/api/levels/me', token),
    enabled: !!token && currentRole === 'provider',
    retry: 1,
    staleTime: 120_000,
  })

  // ---------- Stat cards per role ----------
  const isHirer = currentRole === 'hirer' || currentRole === 'customer'
  const isProvider = currentRole === 'provider'
  const isAdvertiser = currentRole === 'advertiser'

  const hirerStatCards = stats
    ? [
        { label: 'Posted Jobs', value: stats.posted_jobs ?? stats.total_bookings ?? 0, icon: Briefcase, color: 'text-blue-600' },
        { label: 'Bids Received', value: stats.active_bids_received ?? 0, icon: Gavel, color: 'text-amber-600' },
        { label: 'Active Contracts', value: stats.active_contracts ?? 0, icon: FileText, color: 'text-green-600' },
        { label: 'Pending Bookings', value: stats.pending_bookings ?? 0, icon: Clock, color: 'text-yellow-600' },
      ]
    : []

  const providerStatCards = stats
    ? [
        { label: 'Available Jobs', value: stats.available_jobs ?? 0, icon: Search, color: 'text-blue-600' },
        { label: 'My Bids', value: stats.my_bids ?? 0, icon: Send, color: 'text-amber-600' },
        { label: 'Active Contracts', value: stats.active_contracts ?? stats.total_bookings ?? 0, icon: FileText, color: 'text-green-600' },
        { label: 'Earnings (Month)', value: `$${(stats.earnings_this_month ?? stats.total_earnings ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600' },
        { label: 'Avg Rating', value: stats.average_rating?.toFixed(1) ?? '--', icon: Star, color: 'text-yellow-500' },
      ]
    : []

  const advertiserStatCards = stats
    ? [
        { label: 'Active Campaigns', value: stats.active_campaigns ?? 0, icon: Megaphone, color: 'text-purple-600' },
        { label: 'Impressions', value: (stats.total_impressions ?? 0).toLocaleString(), icon: Eye, color: 'text-blue-600' },
        { label: 'Clicks', value: (stats.total_clicks ?? 0).toLocaleString(), icon: MousePointerClick, color: 'text-green-600' },
        { label: 'CTR', value: `${(stats.ctr ?? 0).toFixed(2)}%`, icon: Target, color: 'text-amber-600' },
        { label: 'Total Spend', value: `$${(stats.total_spend ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-red-600' },
      ]
    : []

  const currentStatCards = isHirer ? hirerStatCards : isProvider ? providerStatCards : advertiserStatCards

  const gridColsMap: Record<number, string> = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' }
  const gridClass = gridColsMap[Math.min(currentStatCards.length, 6)] || 'lg:grid-cols-4'

  // ---------- Quick actions per role ----------
  const hirerActions = [
    { to: '/job-board', icon: Plus, label: 'Post a Job', description: 'Create a new job listing', color: 'bg-blue-100 text-blue-700' },
    { to: '/search', icon: Search, label: 'Browse Providers', description: 'Find service providers', color: 'bg-green-100 text-green-700' },
    { to: '/bookings', icon: FileText, label: 'View Contracts', description: 'Manage your contracts', color: 'bg-purple-100 text-purple-700' },
    { to: '/messages', icon: MessageSquare, label: 'Messages', description: 'Check messages', color: 'bg-orange-100 text-orange-700' },
    { to: '/job-board', icon: Briefcase, label: 'Job Board', description: 'View all job listings', color: 'bg-amber-100 text-amber-700' },
  ]

  const providerActions = [
    { to: '/job-board', icon: Search, label: 'Browse Jobs', description: 'Find available work', color: 'bg-blue-100 text-blue-700' },
    { to: '/listings', icon: Briefcase, label: 'My Listings', description: 'Manage your services', color: 'bg-green-100 text-green-700' },
    { to: '/bookings', icon: DollarSign, label: 'View Earnings', description: 'Track your income', color: 'bg-emerald-100 text-emerald-700' },
    { to: '/reviews', icon: Star, label: 'My Reviews', description: 'See client feedback', color: 'bg-yellow-100 text-yellow-700' },
    { to: '/messages', icon: MessageSquare, label: 'Messages', description: 'Check messages', color: 'bg-purple-100 text-purple-700' },
  ]

  const advertiserActions = [
    { to: '/advertiser', icon: Plus, label: 'Create Campaign', description: 'Launch a new ad', color: 'bg-purple-100 text-purple-700' },
    { to: '/advertiser', icon: BarChart3, label: 'View Analytics', description: 'Campaign performance', color: 'bg-blue-100 text-blue-700' },
    { to: '/advertiser', icon: Image, label: 'Manage Creative', description: 'Upload ad assets', color: 'bg-green-100 text-green-700' },
    { to: '/messages', icon: MessageSquare, label: 'Messages', description: 'Check messages', color: 'bg-orange-100 text-orange-700' },
  ]

  const currentActions = isHirer ? hirerActions : isProvider ? providerActions : advertiserActions

  // ---------- Activity descriptions ----------
  const hirerActivityLabel = 'Latest bids received and contract updates'
  const providerActivityLabel = 'New job matches, bid updates, and incoming bookings'
  const advertiserActivityLabel = 'Campaign status changes and performance alerts'
  const activityLabel = isHirer ? hirerActivityLabel : isProvider ? providerActivityLabel : advertiserActivityLabel

  const availableRoles = roles.length > 0 ? roles : user?.roles || ['customer']

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-JM', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-8">
      {/* Email Verification Banner */}
      {user && user.email && !user.email_verified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg shrink-0">
              <Mail className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">Verify your email address</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Please verify your email to access payments, bidding, and job posting features.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowVerifyModal(true)}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition"
            >
              Enter Code
            </button>
            <button
              onClick={() => resendVerificationMutation.mutate()}
              disabled={resendVerificationMutation.isPending}
              className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition disabled:opacity-50 flex items-center gap-1"
            >
              {resendVerificationMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Resend Email
            </button>
          </div>
        </div>
      )}

      {/* Email Verification Code Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Verify Your Email</h3>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Enter the 6-digit code sent to your email address.
            </p>
            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => resendVerificationMutation.mutate()}
                disabled={resendVerificationMutation.isPending}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
              <button
                onClick={() => verifyEmailMutation.mutate(verificationCode)}
                disabled={verifyEmailMutation.isPending || verificationCode.length !== 6}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {verifyEmailMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Progress Banner */}
      <VerificationProgress />

      {/* Welcome + Role Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{user?.display_name ? `, ${user.display_name}` : ''}!
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
            Viewing as{' '}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_COLORS[currentRole] || 'bg-gray-100 text-gray-700'}`}>
              {ROLE_LABELS[currentRole] || currentRole}
            </span>
            {isProvider && levelData?.level && (
              <ProviderLevelBadge level={levelData.level} size="sm" />
            )}
          </p>
        </div>

        {/* Role Switcher */}
        {availableRoles.length > 1 && (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500 mr-1">Switch:</span>
            {availableRoles.map(role => (
              <button
                key={role}
                onClick={() => switchRoleMutation.mutate(role)}
                disabled={switchRoleMutation.isPending || role === currentRole}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                  role === currentRole
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                {ROLE_LABELS[role] || role}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {currentActions.map(action => (
            <Link
              key={action.to + action.label}
              to={action.to}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-primary/30 transition group"
            >
              <div className={`p-3 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="font-medium text-gray-800 text-sm">{action.label}</span>
              <span className="text-xs text-gray-500 text-center">{action.description}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          {isHirer ? 'Hiring Overview' : isProvider ? 'Provider Stats' : 'Campaign Overview'}
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
          <div className={`grid grid-cols-2 sm:grid-cols-3 ${gridClass} gap-4`}>
            {currentStatCards.map(stat => (
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

      {/* 30-Day Trends / Earnings Chart */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {isProvider ? '30-Day Earnings' : isAdvertiser ? '30-Day Campaign Performance' : '30-Day Trends'}
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
              <p className="text-xs text-gray-400 mt-1">Data will appear once you have activity.</p>
            </div>
          </div>
        ) : trends?.data && trends.data.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-3">
              {/* Bar chart */}
              <div className="flex items-end gap-1 h-40">
                {trends.data.map((point, idx) => {
                  const dataKey = isProvider ? 'earnings' : 'bookings'
                  const val = (point[dataKey] as number) || point.bookings || point.revenue || 0
                  const maxVal = Math.max(...trends.data.map(p => {
                    const v = (p[dataKey] as number) || p.bookings || p.revenue || 0
                    return v
                  }), 1)
                  const height = (val / maxVal) * 100
                  return (
                    <div
                      key={idx}
                      className="flex-1 group relative"
                      title={`${point.date}: ${isProvider ? '$' : ''}${val}${isProvider ? '' : ' bookings'}`}
                    >
                      <div
                        className={`${isProvider ? 'bg-emerald-500/70 hover:bg-emerald-500' : isAdvertiser ? 'bg-purple-500/70 hover:bg-purple-500' : 'bg-primary/70 hover:bg-primary'} rounded-t transition-colors w-full`}
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
                  {isProvider
                    ? `Total earnings: $${trends.data.reduce((sum, p) => sum + (p.earnings || p.revenue || 0), 0).toLocaleString()}`
                    : `Total bookings: ${trends.data.reduce((sum, p) => sum + (p.bookings || 0), 0)}`}
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
            <p className="text-gray-400 text-xs mt-1">
              {isProvider ? 'Start completing jobs to see earnings trends.' :
               isAdvertiser ? 'Launch a campaign to see performance data.' :
               'Start booking services to see your activity trends.'}
            </p>
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Recent Activity
        </h2>
        <p className="text-xs text-gray-400 mb-4">{activityLabel}</p>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {activity && activity.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {activity.map(item => (
                <div key={item.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 truncate">{item.description}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{formatDate(item.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No recent activity yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Common Sections: Notifications + Messages side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications Summary */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
              {(notifications?.unread_count ?? 0) > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  {notifications!.unread_count}
                </span>
              )}
            </h2>
            <Link to="/notifications" className="text-xs text-primary font-medium hover:underline">
              View All
            </Link>
          </div>
          {notifications?.recent && notifications.recent.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {notifications.recent.slice(0, 4).map(n => (
                <div key={n.id} className={`px-6 py-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                  <p className="text-sm text-gray-900 truncate">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 truncate mt-0.5">{n.body}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No notifications</p>
            </div>
          )}
        </section>

        {/* Messages Summary */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Messages
              {(messages?.unread_count ?? 0) > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  {messages!.unread_count}
                </span>
              )}
            </h2>
            <Link to="/messages" className="text-xs text-primary font-medium hover:underline">
              View All
            </Link>
          </div>
          {messages?.recent_threads && messages.recent_threads.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {messages.recent_threads.slice(0, 4).map(t => (
                <Link key={t.id} to="/messages" className="block px-6 py-3 hover:bg-gray-50 transition">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.participant_name}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{t.last_message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(t.updated_at)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No messages yet</p>
            </div>
          )}
        </section>
      </div>

      {/* Pan di Ends - Upcoming Events */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Pan di Ends
        </h2>
        <p className="text-xs text-gray-400 -mt-3 mb-4">Upcoming events near you</p>

        {upcomingEvents && upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingEvents.map(event => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-primary/30 transition group"
              >
                <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition">
                  {event.title}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {new Date(event.start_date).toLocaleDateString('en-JM', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                {(event.location_text || event.parish) && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <MapPin className="h-3 w-3" />
                    {event.location_text || event.parish}
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No upcoming events nearby.</p>
            <Link to="/events" className="text-xs text-primary font-medium hover:underline mt-2 inline-block">
              Browse Events <ArrowRight className="h-3 w-3 inline ml-0.5" />
            </Link>
          </div>
        )}
      </section>

      {/* Role-specific CTA links */}
      {isHirer && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-900">Looking for providers?</p>
            <p className="text-xs text-blue-700 mt-0.5">Browse the Job Board to find and hire skilled professionals.</p>
          </div>
          <Link to="/jobs" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center gap-1">
            Job Board <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {isAdvertiser && (
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-purple-900">Manage your campaigns</p>
            <p className="text-xs text-purple-700 mt-0.5">Access the full Advertiser Dashboard for detailed analytics and campaign management.</p>
          </div>
          <Link to="/advertiser" className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition flex items-center gap-1">
            Advertiser Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
