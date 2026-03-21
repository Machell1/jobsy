import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, ApiError } from '../lib/api'
import {
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Search,
  ChevronDown,
  Loader2,
  XCircle,
  Eye,
  Ban,
  Trash2,
  FileCheck,
  BarChart3,
  RefreshCw,
  DollarSign,
  Megaphone,
  Image,
  Calendar,
  FileText,
  Gavel,
  Settings,
  Save,
  TrendingUp,
  Zap,
  MapPin,
  ExternalLink,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  pending_moderation: number
  resolved_moderation: number
  total_admin_actions: number
  // Revenue fields
  total_platform_fees?: number
  event_posting_fees?: number
  ad_revenue?: number
  boost_revenue?: number
  total_revenue?: number
}

interface ModerationItem {
  id: string
  item_type: string
  item_id: string
  reported_by: string
  reason: string
  status: string
  created_at: string
}

interface AuditEntry {
  id: string
  admin_id: string
  action: string
  target_type: string
  target_id: string
  reason: string | null
  details: Record<string, unknown>
  created_at: string
}

interface VerificationItem {
  id: string
  user_id: string
  type: string
  status: string
  submitted_at: string | null
  created_at: string
  assets: { id: string; asset_type: string; file_url: string; thumbnail_url?: string }[]
}

interface FeeConfig {
  platform_fee_percent: number
  event_posting_fee: number
  boost_fee: number
}

interface ContentModerationItem {
  id: string
  public_id: string
  resource_type: string
  moderation_status: string
  moderation_kind: string
  url: string
  thumbnail_url?: string
  created_at: string
}

interface PendingAdCampaign {
  id: string
  name: string
  ad_type: string
  advertiser_id: string
  creative_url: string | null
  creative_type: string
  click_url: string | null
  budget: number | null
  status: string
  created_at: string
}

interface EventItem {
  id: string
  title: string
  status: string
  start_date: string
  parish: string | null
  organizer_id: string
  rsvp_count: number
}

interface ContractOverview {
  id: string
  title: string
  hirer_id: string
  provider_id: string
  status: string
  agreed_amount: number
  currency: string
  dispute_status: string | null
  created_at: string
}

type Tab = 'overview' | 'moderation' | 'verifications' | 'audit' | 'revenue' | 'ads' | 'events' | 'contracts'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminDashboardPage() {
  const { token, user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [moderationFilter, setModerationFilter] = useState('pending')
  const [userActionId, setUserActionId] = useState('')
  const [userActionType, setUserActionType] = useState('suspend')
  const [userActionReason, setUserActionReason] = useState('')
  const [showUserAction, setShowUserAction] = useState(false)

  // Fee editing state
  const [editingFees, setEditingFees] = useState(false)
  const [feeForm, setFeeForm] = useState<FeeConfig>({ platform_fee_percent: 0, event_posting_fee: 0, boost_fee: 0 })

  const isAdmin = user?.roles?.includes('admin')

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiGet('/api/admin/dashboard/stats', token),
    enabled: !!token && isAdmin,
  })

  const { data: moderationItems = [], isLoading: modLoading } = useQuery<ModerationItem[]>({
    queryKey: ['admin', 'moderation', moderationFilter],
    queryFn: () => apiGet(`/api/admin/moderation?status=${moderationFilter}`, token),
    enabled: !!token && isAdmin && (activeTab === 'overview' || activeTab === 'moderation'),
  })

  const { data: verifications = [], isLoading: verifLoading } = useQuery<VerificationItem[]>({
    queryKey: ['admin', 'verifications'],
    queryFn: () => apiGet('/api/admin/verifications/pending', token),
    enabled: !!token && isAdmin && (activeTab === 'overview' || activeTab === 'verifications'),
  })

  const { data: auditLog = [], isLoading: auditLoading } = useQuery<AuditEntry[]>({
    queryKey: ['admin', 'audit-log'],
    queryFn: () => apiGet('/api/admin/audit-log?limit=50', token),
    enabled: !!token && isAdmin && (activeTab === 'overview' || activeTab === 'audit'),
  })

  const { data: feeConfig, isLoading: feesLoading } = useQuery<FeeConfig>({
    queryKey: ['admin', 'fee-config'],
    queryFn: () => apiGet('/api/ads/admin/config/fees', token),
    enabled: !!token && isAdmin && (activeTab === 'overview' || activeTab === 'revenue'),
  })

  const { data: contentQueue = [], isLoading: contentQueueLoading } = useQuery<ContentModerationItem[]>({
    queryKey: ['admin', 'content-moderation'],
    queryFn: () => apiGet('/api/storage/moderation/queue', token),
    enabled: !!token && isAdmin && (activeTab === 'overview' || activeTab === 'moderation'),
  })

  const { data: pendingAds = [], isLoading: pendingAdsLoading } = useQuery<PendingAdCampaign[]>({
    queryKey: ['admin', 'pending-ads'],
    queryFn: () => apiGet('/api/ads/admin/pending', token),
    enabled: !!token && isAdmin && (activeTab === 'overview' || activeTab === 'ads'),
  })

  const { data: events = [], isLoading: eventsLoading } = useQuery<EventItem[]>({
    queryKey: ['admin', 'events'],
    queryFn: () => apiGet('/api/events?limit=50', token),
    enabled: !!token && isAdmin && activeTab === 'events',
  })

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<ContractOverview[]>({
    queryKey: ['admin', 'contracts'],
    queryFn: () => apiGet('/api/admin/contracts?limit=50', token),
    enabled: !!token && isAdmin && activeTab === 'contracts',
  })

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const resolveMutation = useMutation({
    mutationFn: ({ itemId, action, reason }: { itemId: string; action: string; reason?: string }) =>
      apiPost(`/api/admin/moderation/${itemId}/resolve`, { action, reason }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast({ title: 'Moderation item resolved' })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to resolve',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  const userActionMutation = useMutation({
    mutationFn: ({ userId, action, reason }: { userId: string; action: string; reason: string }) =>
      apiPost(`/api/admin/users/${userId}/action`, { action, reason }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast({ title: 'User action completed' })
      setShowUserAction(false)
      setUserActionId('')
      setUserActionReason('')
    },
    onError: (error: unknown) => {
      toast({
        title: 'Action failed',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  const reviewVerificationMutation = useMutation({
    mutationFn: ({ requestId, decision, notes }: { requestId: string; decision: string; notes?: string }) =>
      apiPost(`/api/admin/verifications/${requestId}/review`, { decision, reviewer_notes: notes }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast({ title: 'Verification reviewed' })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Review failed',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  const updateFeesMutation = useMutation({
    mutationFn: (data: FeeConfig) =>
      apiPut('/api/ads/admin/config/fees', data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'fee-config'] })
      toast({ title: 'Fee configuration updated' })
      setEditingFees(false)
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to update fees',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  const approveAdMutation = useMutation({
    mutationFn: ({ campaignId, action, note }: { campaignId: string; action: 'approve' | 'reject'; note?: string }) =>
      apiPost(`/api/ads/admin/${campaignId}/${action}`, { admin_note: note }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-ads'] })
      toast({ title: 'Campaign updated' })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Action failed',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  const approveContentMutation = useMutation({
    mutationFn: ({ itemId, action }: { itemId: string; action: 'approve' | 'reject' }) =>
      apiPost(`/api/storage/moderation/${itemId}/${action}`, {}, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content-moderation'] })
      toast({ title: 'Content moderation updated' })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Moderation failed',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  // ---------------------------------------------------------------------------
  // Guards & helpers
  // ---------------------------------------------------------------------------

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Shield className="h-12 w-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
        <p className="text-sm text-gray-500">You don't have permission to access this page.</p>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'moderation', label: 'Moderation', icon: AlertTriangle },
    { id: 'ads', label: 'Ad Approval', icon: Megaphone },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'contracts', label: 'Contracts', icon: FileText },
    { id: 'verifications', label: 'Verifications', icon: FileCheck },
    { id: 'audit', label: 'Audit Log', icon: Activity },
  ]

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-JM', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage users, moderate content, and monitor the platform.</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin'] })}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'ads' && pendingAds.length > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{pendingAds.length}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ================================================================== */}
      {/* OVERVIEW TAB                                                       */}
      {/* ================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Moderation Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stats?.pending_moderation ?? 0}</p>
                      <p className="text-xs text-gray-500">Pending Moderation</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stats?.resolved_moderation ?? 0}</p>
                      <p className="text-xs text-gray-500">Resolved Items</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stats?.total_admin_actions ?? 0}</p>
                      <p className="text-xs text-gray-500">Admin Actions</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(stats?.total_platform_fees ?? 0)}</p>
                      <p className="text-xs text-gray-500">Platform Fees</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(stats?.event_posting_fees ?? 0)}</p>
                      <p className="text-xs text-gray-500">Event Fees</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Megaphone className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(stats?.ad_revenue ?? 0)}</p>
                      <p className="text-xs text-gray-500">Ad Revenue</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <Zap className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(stats?.boost_revenue ?? 0)}</p>
                      <p className="text-xs text-gray-500">Boost Revenue</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Quick sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Moderation */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Pending Moderation</h2>
                <button onClick={() => setActiveTab('moderation')} className="text-xs text-primary font-medium hover:underline">
                  View All
                </button>
              </div>
              {modLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : moderationItems.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No pending items</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {moderationItems.slice(0, 5).map(item => (
                    <div key={item.id} className="px-6 py-3 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.item_type}</p>
                        <p className="text-xs text-gray-500 truncate">{item.reason}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{formatDate(item.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Ad Approvals */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  Pending Ad Campaigns
                  {pendingAds.length > 0 && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{pendingAds.length}</span>
                  )}
                </h2>
                <button onClick={() => setActiveTab('ads')} className="text-xs text-primary font-medium hover:underline">
                  View All
                </button>
              </div>
              {pendingAdsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : pendingAds.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No pending campaigns</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pendingAds.slice(0, 5).map(ad => (
                    <div key={ad.id} className="px-6 py-3 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{ad.name}</p>
                        <p className="text-xs text-gray-500">{ad.ad_type} | Budget: {ad.budget ? `$${ad.budget}` : 'N/A'}</p>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => approveAdMutation.mutate({ campaignId: ad.id, action: 'approve' })}
                          disabled={approveAdMutation.isPending}
                          className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => approveAdMutation.mutate({ campaignId: ad.id, action: 'reject' })}
                          disabled={approveAdMutation.isPending}
                          className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Verifications */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Pending Verifications</h2>
                <button onClick={() => setActiveTab('verifications')} className="text-xs text-primary font-medium hover:underline">
                  View All
                </button>
              </div>
              {verifLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : verifications.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No pending verifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {verifications.slice(0, 5).map(item => (
                    <div key={item.id} className="px-6 py-3 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 capitalize">{item.type} verification</p>
                        <p className="text-xs text-gray-500">User: {item.user_id.slice(0, 8)}...</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{formatDate(item.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Content Moderation Queue */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Image className="h-4 w-4 text-gray-400" />
                  Flagged Media
                  {contentQueue.length > 0 && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{contentQueue.length}</span>
                  )}
                </h2>
              </div>
              {contentQueueLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : contentQueue.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No flagged media</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {contentQueue.slice(0, 5).map(item => (
                    <div key={item.id} className="px-6 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                            <Image className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.resource_type}</p>
                          <p className="text-xs text-gray-500">{item.moderation_kind}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => approveContentMutation.mutate({ itemId: item.id, action: 'approve' })}
                          disabled={approveContentMutation.isPending}
                          className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => approveContentMutation.mutate({ itemId: item.id, action: 'reject' })}
                          disabled={approveContentMutation.isPending}
                          className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Audit Log */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
              <button onClick={() => setActiveTab('audit')} className="text-xs text-primary font-medium hover:underline">
                View All
              </button>
            </div>
            {auditLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : auditLog.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {auditLog.slice(0, 5).map(entry => (
                  <div key={entry.id} className="px-6 py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                      <p className="text-xs text-gray-500">{entry.target_type}: {entry.target_id.slice(0, 8)}...</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{formatDate(entry.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* REVENUE TAB                                                        */}
      {/* ================================================================== */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Revenue Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Revenue', value: formatCurrency(stats?.total_revenue ?? ((stats?.total_platform_fees ?? 0) + (stats?.event_posting_fees ?? 0) + (stats?.ad_revenue ?? 0) + (stats?.boost_revenue ?? 0))), icon: TrendingUp, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
              { label: 'Platform Fees', value: formatCurrency(stats?.total_platform_fees ?? 0), icon: DollarSign, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
              { label: 'Event Posting Fees', value: formatCurrency(stats?.event_posting_fees ?? 0), icon: Calendar, bg: 'bg-purple-50', iconColor: 'text-purple-600' },
              { label: 'Ad Revenue', value: formatCurrency(stats?.ad_revenue ?? 0), icon: Megaphone, bg: 'bg-amber-50', iconColor: 'text-amber-600' },
              { label: 'Boost Revenue', value: formatCurrency(stats?.boost_revenue ?? 0), icon: Zap, bg: 'bg-pink-50', iconColor: 'text-pink-600' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${item.bg} rounded-lg`}>
                    <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{item.value}</p>
                    <p className="text-xs text-gray-500">{item.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Fee Configuration */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-400" />
                Fee Configuration
              </h2>
              {!editingFees ? (
                <button
                  onClick={() => {
                    if (feeConfig) {
                      setFeeForm(feeConfig)
                    }
                    setEditingFees(true)
                  }}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingFees(false)}
                    className="text-xs text-gray-500 font-medium hover:underline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateFeesMutation.mutate(feeForm)}
                    disabled={updateFeesMutation.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {updateFeesMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                  </button>
                </div>
              )}
            </div>
            <div className="px-6 py-4">
              {feesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : editingFees ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Platform Fee (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={feeForm.platform_fee_percent}
                      onChange={e => setFeeForm(f => ({ ...f, platform_fee_percent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Event Posting Fee ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={feeForm.event_posting_fee}
                      onChange={e => setFeeForm(f => ({ ...f, event_posting_fee: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Boost Fee ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={feeForm.boost_fee}
                      onChange={e => setFeeForm(f => ({ ...f, boost_fee: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Platform Fee</p>
                    <p className="text-lg font-semibold text-gray-900">{feeConfig?.platform_fee_percent ?? 0}%</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Event Posting Fee</p>
                    <p className="text-lg font-semibold text-gray-900">${feeConfig?.event_posting_fee ?? 0}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Boost Fee</p>
                    <p className="text-lg font-semibold text-gray-900">${feeConfig?.boost_fee ?? 0}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODERATION TAB                                                     */}
      {/* ================================================================== */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={moderationFilter}
              onChange={e => setModerationFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {/* Report Moderation */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Reported Content</h3>
            </div>
            {modLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : moderationItems.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No {moderationFilter} items</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {moderationItems.map(item => (
                  <div key={item.id} className="px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 capitalize">
                            {item.item_type}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(item.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{item.reason}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Item: {item.item_id.slice(0, 8)}... | Reporter: {item.reported_by.slice(0, 8)}...
                        </p>
                      </div>
                      {item.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => resolveMutation.mutate({ itemId: item.id, action: 'approve' })}
                            disabled={resolveMutation.isPending}
                            className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => resolveMutation.mutate({ itemId: item.id, action: 'remove' })}
                            disabled={resolveMutation.isPending}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => resolveMutation.mutate({ itemId: item.id, action: 'dismiss' })}
                            disabled={resolveMutation.isPending}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cloudinary Content Moderation Queue */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Image className="h-4 w-4 text-gray-400" />
                Flagged Media (Cloudinary Moderation)
              </h3>
            </div>
            {contentQueueLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : contentQueue.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <CheckCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No flagged media to review</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {contentQueue.map(item => (
                  <div key={item.id} className="px-6 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {item.thumbnail_url || item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <img src={item.thumbnail_url || item.url} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                        </a>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Image className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 capitalize">{item.resource_type}</p>
                        <p className="text-xs text-gray-500">Reason: {item.moderation_kind}</p>
                        <p className="text-xs text-gray-400 mt-0.5">ID: {item.public_id}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => approveContentMutation.mutate({ itemId: item.id, action: 'approve' })}
                        disabled={approveContentMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => approveContentMutation.mutate({ itemId: item.id, action: 'reject' })}
                        disabled={approveContentMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Action Panel */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              User Management
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={userActionId}
                onChange={e => setUserActionId(e.target.value)}
                placeholder="User ID"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <select
                value={userActionType}
                onChange={e => setUserActionType(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="suspend">Suspend</option>
                <option value="unsuspend">Unsuspend</option>
                <option value="warn">Warn</option>
                <option value="delete">Delete</option>
              </select>
              <button
                onClick={() => {
                  if (userActionId.trim()) setShowUserAction(true)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition"
              >
                Take Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* AD APPROVAL TAB                                                    */}
      {/* ================================================================== */}
      {activeTab === 'ads' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Pending Ad Campaigns</h2>
          </div>
          {pendingAdsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingAds.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No pending ad campaigns</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingAds.map(ad => (
                <div key={ad.id} className="px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 capitalize">
                          {ad.ad_type}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700`}>
                          {ad.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{ad.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                        <span>Budget: {ad.budget ? `$${ad.budget}` : 'N/A'}</span>
                        <span>Creative: {ad.creative_type}</span>
                        <span>Advertiser: {ad.advertiser_id.slice(0, 8)}...</span>
                      </div>
                      {ad.creative_url && (
                        <a href={ad.creative_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                          <ExternalLink className="h-3 w-3" /> View Creative
                        </a>
                      )}
                      {ad.click_url && (
                        <a href={ad.click_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:underline mt-1 ml-3">
                          <ExternalLink className="h-3 w-3" /> Click URL
                        </a>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatDate(ad.created_at)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => approveAdMutation.mutate({ campaignId: ad.id, action: 'approve' })}
                        disabled={approveAdMutation.isPending}
                        className="px-4 py-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => approveAdMutation.mutate({ campaignId: ad.id, action: 'reject', note: 'Rejected by admin' })}
                        disabled={approveAdMutation.isPending}
                        className="px-4 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* EVENTS TAB                                                         */}
      {/* ================================================================== */}
      {activeTab === 'events' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Platform Events</h2>
          </div>
          {eventsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No events on the platform</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Parish</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">RSVPs</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Organizer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {events.map(event => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900 max-w-[200px] truncate">{event.title}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          event.status === 'published' ? 'bg-green-100 text-green-700' :
                          event.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                          event.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(event.start_date)}</td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{event.parish || '--'}</td>
                      <td className="px-6 py-3 text-gray-700 font-medium">{event.rsvp_count}</td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{event.organizer_id.slice(0, 8)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* CONTRACTS TAB                                                      */}
      {/* ================================================================== */}
      {activeTab === 'contracts' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Contracts Overview</h2>
          </div>
          {contractsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No contracts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Dispute</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Hirer</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Provider</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contracts.map(contract => (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900 max-w-[200px] truncate">{contract.title}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          contract.status === 'active' ? 'bg-green-100 text-green-700' :
                          contract.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          contract.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          contract.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {contract.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {contract.dispute_status ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 capitalize">
                            {contract.dispute_status}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-700 font-medium">
                        {contract.currency === 'JMD' ? 'J' : ''}${contract.agreed_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{contract.hirer_id.slice(0, 8)}...</td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{contract.provider_id.slice(0, 8)}...</td>
                      <td className="px-6 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(contract.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* VERIFICATIONS TAB                                                  */}
      {/* ================================================================== */}
      {activeTab === 'verifications' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {verifLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : verifications.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileCheck className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No pending verifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {verifications.map(item => (
                <div key={item.id} className="px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                          {item.type}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          item.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">User: {item.user_id.slice(0, 12)}...</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.created_at)}</p>
                      {item.assets.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {item.assets.map(asset => (
                            <a
                              key={asset.id}
                              href={asset.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-100 block"
                            >
                              <img
                                src={asset.thumbnail_url || asset.file_url}
                                alt={asset.asset_type}
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => reviewVerificationMutation.mutate({ requestId: item.id, decision: 'approve' })}
                        disabled={reviewVerificationMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reviewVerificationMutation.mutate({ requestId: item.id, decision: 'reject', notes: 'Rejected by admin' })}
                        disabled={reviewVerificationMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => reviewVerificationMutation.mutate({ requestId: item.id, decision: 'request_resubmission', notes: 'Please resubmit with clearer documents' })}
                        disabled={reviewVerificationMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition"
                      >
                        Resubmit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* AUDIT LOG TAB                                                      */}
      {/* ================================================================== */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {auditLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : auditLog.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Activity className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No audit log entries</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Target</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Admin</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLog.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        <span className="text-xs text-gray-500">{entry.target_type}:</span>{' '}
                        {entry.target_id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{entry.admin_id.slice(0, 8)}...</td>
                      <td className="px-6 py-3 text-gray-500 text-xs max-w-[200px] truncate">{entry.reason || '--'}</td>
                      <td className="px-6 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(entry.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* User Action Confirmation Modal */}
      {showUserAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm User Action
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You are about to <span className="font-semibold text-red-600">{userActionType}</span> user{' '}
              <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{userActionId}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                value={userActionReason}
                onChange={e => setUserActionReason(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Reason for this action..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowUserAction(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (userActionReason.trim()) {
                    userActionMutation.mutate({
                      userId: userActionId,
                      action: userActionType,
                      reason: userActionReason,
                    })
                  }
                }}
                disabled={!userActionReason.trim() || userActionMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {userActionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm {userActionType}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
