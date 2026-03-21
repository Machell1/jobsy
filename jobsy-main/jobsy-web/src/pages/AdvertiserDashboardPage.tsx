import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '../lib/api'
import {
  Megaphone,
  Plus,
  BarChart3,
  Eye,
  MousePointerClick,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Loader2,
  ArrowLeft,
  Image,
  Video,
  Target,
  Calendar,
  TrendingUp,
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  ad_type: string
  creative_url: string | null
  creative_type: string
  click_url: string | null
  target_parishes: string[]
  target_categories: string[]
  budget: number | null
  pricing_model: string
  status: string
  admin_note: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  analytics?: {
    impressions: number
    clicks: number
    ctr: number
    spend: number
    budget_remaining: number | null
  }
}

interface DashboardSummary {
  campaigns_by_status: Record<string, number>
  total_campaigns: number
  total_impressions: number
  total_clicks: number
  overall_ctr: number
  total_budget: number
}

const PARISHES = [
  'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary',
  'St. Ann', 'Trelawny', 'St. James', 'Hanover', 'Westmoreland',
  'St. Elizabeth', 'Manchester', 'Clarendon', 'St. Catherine',
]

const AD_TYPES = [
  { value: 'banner', label: 'Banner Ad' },
  { value: 'sponsored_listing', label: 'Sponsored Listing' },
  { value: 'featured_profile', label: 'Featured Profile' },
  { value: 'native', label: 'Native Ad' },
]

const STATUS_BADGES: Record<string, { color: string; icon: typeof Clock }> = {
  pending_review: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  active: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  paused: { color: 'bg-gray-100 text-gray-600', icon: Pause },
  rejected: { color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
}

export default function AdvertiserDashboardPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [view, setView] = useState<'list' | 'create' | 'detail'>('list')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formAdType, setFormAdType] = useState('banner')
  const [formCreativeUrl, setFormCreativeUrl] = useState('')
  const [formCreativeType, setFormCreativeType] = useState('image')
  const [formClickUrl, setFormClickUrl] = useState('')
  const [formParishes, setFormParishes] = useState<string[]>([])
  const [formCategories, setFormCategories] = useState('')
  const [formBudget, setFormBudget] = useState('')
  const [formPricingModel, setFormPricingModel] = useState('cpm')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')

  // Dashboard summary
  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ['ads-dashboard'],
    queryFn: () => apiGet('/api/ads/dashboard', token),
    enabled: !!token,
  })

  // Campaign list
  const { data: campaigns, isLoading: loadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ['ads-campaigns'],
    queryFn: () => apiGet('/api/ads/campaigns', token),
    enabled: !!token,
  })

  // Campaign detail
  const { data: campaignDetail, isLoading: loadingDetail } = useQuery<Campaign>({
    queryKey: ['ads-campaign', selectedCampaignId],
    queryFn: () => apiGet(`/api/ads/campaigns/${selectedCampaignId}`, token),
    enabled: !!token && !!selectedCampaignId && view === 'detail',
  })

  // Create campaign
  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiPost('/api/ads/campaigns', payload, token),
    onSuccess: () => {
      toast({ title: 'Campaign created! It will be reviewed by an admin.' })
      queryClient.invalidateQueries({ queryKey: ['ads-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['ads-dashboard'] })
      resetForm()
      setView('list')
    },
    onError: (err: ApiError) => toast({ title: err.detail || 'Failed to create campaign', variant: 'destructive' }),
  })

  // Delete campaign
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/ads/campaigns/${id}`, token),
    onSuccess: () => {
      toast({ title: 'Campaign deleted' })
      queryClient.invalidateQueries({ queryKey: ['ads-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['ads-dashboard'] })
      setView('list')
    },
    onError: (err: ApiError) => toast({ title: err.detail || 'Failed to delete campaign', variant: 'destructive' }),
  })

  function resetForm() {
    setFormName('')
    setFormAdType('banner')
    setFormCreativeUrl('')
    setFormCreativeType('image')
    setFormClickUrl('')
    setFormParishes([])
    setFormCategories('')
    setFormBudget('')
    setFormPricingModel('cpm')
    setFormStartDate('')
    setFormEndDate('')
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formName || !formBudget) {
      toast({ title: 'Please fill in campaign name and budget', variant: 'destructive' })
      return
    }
    createMutation.mutate({
      name: formName,
      ad_type: formAdType,
      creative_url: formCreativeUrl || null,
      creative_type: formCreativeType,
      click_url: formClickUrl || null,
      target_parishes: formParishes,
      target_categories: formCategories ? formCategories.split(',').map(s => s.trim()) : [],
      budget: parseFloat(formBudget),
      pricing_model: formPricingModel,
      start_date: formStartDate || null,
      end_date: formEndDate || null,
    })
  }

  function toggleParish(parish: string) {
    setFormParishes(prev =>
      prev.includes(parish) ? prev.filter(p => p !== parish) : [...prev, parish]
    )
  }

  // ------- Campaign Detail View -------
  if (view === 'detail' && selectedCampaignId) {
    const c = campaignDetail
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => { setView('list'); setSelectedCampaignId(null) }}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to campaigns
        </button>

        {loadingDetail ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : c ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{c.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  {(() => {
                    const badge = STATUS_BADGES[c.status] || STATUS_BADGES.pending_review
                    const Icon = badge.icon
                    return (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                        <Icon className="h-3 w-3" />
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    )
                  })()}
                  <span className="text-sm text-gray-500">
                    {c.ad_type.replace(/_/g, ' ')} &middot; {c.pricing_model.toUpperCase()}
                  </span>
                </div>
              </div>
              {c.status !== 'active' && (
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              )}
            </div>

            {c.status === 'pending_review' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <Clock className="inline h-4 w-4 mr-1" />
                Admin Approval Required -- Your campaign is under review and will go live once approved.
              </div>
            )}

            {c.admin_note && (
              <div className="bg-gray-50 border rounded-lg p-4 text-sm">
                <strong>Admin Note:</strong> {c.admin_note}
              </div>
            )}

            {/* Analytics */}
            {c.analytics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Eye className="h-4 w-4" /> Impressions
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{c.analytics.impressions.toLocaleString()}</p>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <MousePointerClick className="h-4 w-4" /> Clicks
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{c.analytics.clicks.toLocaleString()}</p>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <TrendingUp className="h-4 w-4" /> CTR
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{c.analytics.ctr}%</p>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <DollarSign className="h-4 w-4" /> Spend
                  </div>
                  <p className="text-2xl font-bold text-gray-900">J${c.analytics.spend.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Campaign Details */}
            <div className="bg-white border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Campaign Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Budget</span>
                  <p className="font-medium">{c.budget ? `J$${c.budget.toLocaleString()}` : 'Not set'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Pricing Model</span>
                  <p className="font-medium">{c.pricing_model === 'cpm' ? 'Cost per 1,000 Impressions (CPM)' : 'Cost per Click (CPC)'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Start Date</span>
                  <p className="font-medium">{c.start_date ? new Date(c.start_date).toLocaleDateString() : 'Immediately'}</p>
                </div>
                <div>
                  <span className="text-gray-500">End Date</span>
                  <p className="font-medium">{c.end_date ? new Date(c.end_date).toLocaleDateString() : 'Until budget spent'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Target Parishes</span>
                  <p className="font-medium">{c.target_parishes.length ? c.target_parishes.join(', ') : 'All parishes'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Target Categories</span>
                  <p className="font-medium">{c.target_categories.length ? c.target_categories.join(', ') : 'All categories'}</p>
                </div>
              </div>
              {c.creative_url && (
                <div>
                  <span className="text-gray-500 text-sm">Creative Preview</span>
                  {c.creative_type === 'video' ? (
                    <video src={c.creative_url} controls className="mt-2 rounded-lg max-h-64 w-full object-cover" />
                  ) : (
                    <img src={c.creative_url} alt={c.name} className="mt-2 rounded-lg max-h-64 w-full object-cover" />
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Campaign not found.</p>
        )}
      </div>
    )
  }

  // ------- Create Campaign View -------
  if (view === 'create') {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setView('list')}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to campaigns
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Ad Campaign</h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 mb-6">
          <Clock className="inline h-4 w-4 mr-1" />
          New campaigns require admin approval before going live.
        </div>

        <form onSubmit={handleCreateSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. Summer Plumbing Promo"
              required
            />
          </div>

          {/* Ad Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Type</label>
            <select
              value={formAdType}
              onChange={e => setFormAdType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {AD_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Creative */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Creative URL</label>
            <input
              type="url"
              value={formCreativeUrl}
              onChange={e => setFormCreativeUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="https://example.com/ad-image.jpg"
            />
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="creative_type"
                  value="image"
                  checked={formCreativeType === 'image'}
                  onChange={() => setFormCreativeType('image')}
                />
                <Image className="h-4 w-4" /> Image
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="creative_type"
                  value="video"
                  checked={formCreativeType === 'video'}
                  onChange={() => setFormCreativeType('video')}
                />
                <Video className="h-4 w-4" /> Video
              </label>
            </div>
          </div>

          {/* Click URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination URL</label>
            <input
              type="url"
              value={formClickUrl}
              onChange={e => setFormClickUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="https://your-business.com"
            />
          </div>

          {/* Parish Targeting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="inline h-4 w-4 mr-1" />
              Target Parishes (leave empty for all)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PARISHES.map(p => (
                <label
                  key={p}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition ${
                    formParishes.includes(p)
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formParishes.includes(p)}
                    onChange={() => toggleParish(p)}
                    className="sr-only"
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          {/* Category Targeting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Categories (comma-separated)</label>
            <input
              type="text"
              value={formCategories}
              onChange={e => setFormCategories(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Plumbing, Electrical, Cleaning"
            />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget (JMD) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">J$</span>
              <input
                type="number"
                value={formBudget}
                onChange={e => setFormBudget(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="5000"
                min="100"
                step="100"
                required
              />
            </div>
          </div>

          {/* Pricing Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Model</label>
            <div className="flex gap-4">
              <label
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm cursor-pointer transition ${
                  formPricingModel === 'cpm'
                    ? 'bg-primary/10 border-primary text-primary font-medium'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="pricing_model"
                  value="cpm"
                  checked={formPricingModel === 'cpm'}
                  onChange={() => setFormPricingModel('cpm')}
                  className="sr-only"
                />
                <Eye className="h-4 w-4" /> CPM (per 1K views)
              </label>
              <label
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm cursor-pointer transition ${
                  formPricingModel === 'cpc'
                    ? 'bg-primary/10 border-primary text-primary font-medium'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="pricing_model"
                  value="cpc"
                  checked={formPricingModel === 'cpc'}
                  onChange={() => setFormPricingModel('cpc')}
                  className="sr-only"
                />
                <MousePointerClick className="h-4 w-4" /> CPC (per click)
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" /> Start Date
              </label>
              <input
                type="date"
                value={formStartDate}
                onChange={e => setFormStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formEndDate}
                onChange={e => setFormEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
            ) : (
              <><Plus className="h-4 w-4" /> Create Campaign</>
            )}
          </button>
        </form>
      </div>
    )
  }

  // ------- Campaign List View (Default) -------
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">Advertiser Dashboard</h1>
        </div>
        <button
          onClick={() => setView('create')}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition text-sm"
        >
          <Plus className="h-4 w-4" /> New Campaign
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <BarChart3 className="h-4 w-4" /> Campaigns
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.total_campaigns}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Eye className="h-4 w-4" /> Total Impressions
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.total_impressions.toLocaleString()}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <MousePointerClick className="h-4 w-4" /> Total Clicks
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.total_clicks.toLocaleString()}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <DollarSign className="h-4 w-4" /> Total Budget
            </div>
            <p className="text-2xl font-bold text-gray-900">J${summary.total_budget.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Campaign List */}
      {loadingCampaigns ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="space-y-3">
          {campaigns.map(c => {
            const badge = STATUS_BADGES[c.status] || STATUS_BADGES.pending_review
            const Icon = badge.icon
            return (
              <button
                key={c.id}
                onClick={() => { setSelectedCampaignId(c.id); setView('detail') }}
                className="w-full text-left bg-white border rounded-lg p-4 hover:shadow-md hover:border-primary/30 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{c.ad_type.replace(/_/g, ' ')}</span>
                      <span>&middot;</span>
                      <span>{c.pricing_model.toUpperCase()}</span>
                      {c.budget && (
                        <>
                          <span>&middot;</span>
                          <span>J${c.budget.toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                    <Icon className="h-3 w-3" />
                    {c.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border rounded-lg">
          <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Create your first ad campaign to reach service seekers across Jamaica.
          </p>
          <button
            onClick={() => setView('create')}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 transition text-sm"
          >
            <Plus className="h-4 w-4" /> Create Campaign
          </button>
        </div>
      )}
    </div>
  )
}
