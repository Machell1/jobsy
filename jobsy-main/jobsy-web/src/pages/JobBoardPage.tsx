import { useState } from 'react'
import SEO from '../components/SEO'
import { useAuth } from '../context/AuthContext'
import { useVerificationGate, VerificationGateModal } from '../components/VerificationProgress'
import { useToast } from '../context/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, ApiError } from '../lib/api'
import {
  Briefcase,
  Loader2,
  Plus,
  DollarSign,
  Clock,
  Users,
  FileText,
  Gavel,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle,
  AlertCircle,
  MapPin,
  Calendar,
  Tag,
  Send,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Star,
  Filter,
  ArrowUpDown,
  Zap,
  AlertTriangle,
  ExternalLink,
  Image,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARISHES = [
  'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary',
  'St. Ann', 'Trelawny', 'St. James', 'Hanover', 'Westmoreland',
  'St. Elizabeth', 'Manchester', 'Clarendon', 'St. Catherine',
]

const CATEGORIES = [
  'Plumbing', 'Electrical', 'Cleaning', 'Beauty', 'Carpentry',
  'Painting', 'Landscaping', 'Auto Repair', 'Moving', 'Tutoring',
  'Photography', 'Catering', 'IT Services', 'General Labour', 'Other',
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'budget_high', label: 'Budget: High to Low' },
  { value: 'budget_low', label: 'Budget: Low to High' },
  { value: 'deadline', label: 'Deadline: Soonest' },
]

const URGENCY_LEVELS = [
  { value: 'standard', label: 'Standard', color: 'bg-gray-100 text-gray-600' },
  { value: 'urgent', label: 'Urgent', color: 'bg-orange-100 text-orange-700' },
  { value: 'emergency', label: 'Emergency', color: 'bg-red-100 text-red-700' },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = 'browse' | 'my-posts' | 'my-bids' | 'contracts'

interface JobPost {
  id: string
  hirer_id?: string
  title: string
  description?: string
  category?: string
  subcategory?: string
  required_skills?: string[]
  budget_min?: number | null
  budget_max?: number | null
  currency?: string
  location_text?: string
  parish?: string
  deadline?: string | null
  bid_deadline?: string | null
  status?: string
  attachments?: string[]
  visibility?: string
  max_bids?: number | null
  bid_count?: number
  has_bid?: boolean
  created_at?: string
  updated_at?: string
}

interface BidItem {
  id: string
  job_post_id?: string
  provider_id?: string
  amount?: number
  currency?: string
  proposal?: string
  estimated_duration_days?: number | null
  available_start_date?: string | null
  attachments?: string[]
  status?: string
  is_winner?: boolean
  hirer_note?: string | null
  provider_display_name?: string
  provider_avatar_url?: string | null
  provider_parish?: string | null
  provider_rating_avg?: number
  provider_review_count?: number
  created_at?: string
  updated_at?: string
  job_post?: {
    id: string
    title: string
    category?: string
    status?: string
    budget_min?: number | null
    budget_max?: number | null
  }
}

interface Contract {
  id: string
  job_post_id?: string
  bid_id?: string
  hirer_id?: string
  provider_id?: string
  title?: string
  scope_of_work?: string
  agreed_amount?: number
  currency?: string
  start_date?: string | null
  estimated_end_date?: string | null
  location_text?: string | null
  parish?: string | null
  status?: string
  contract_pdf_url?: string | null
  created_at?: string
  updated_at?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatBudget(min?: number | null, max?: number | null, currency = 'JMD'): string {
  if (min != null && max != null) return `$${min.toLocaleString()} - $${max.toLocaleString()} ${currency}`
  if (max != null) return `Up to $${max.toLocaleString()} ${currency}`
  if (min != null) return `From $${min.toLocaleString()} ${currency}`
  return 'Open to bids'
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase()
  let color = 'bg-gray-100 text-gray-600'
  if (s === 'open' || s === 'active') color = 'bg-green-50 text-green-700'
  if (s === 'closed' || s === 'completed' || s === 'fully_signed') color = 'bg-blue-50 text-blue-700'
  if (s === 'pending' || s === 'submitted' || s === 'pending_signatures') color = 'bg-yellow-50 text-yellow-700'
  if (s === 'accepted' || s === 'awarded') color = 'bg-primary/10 text-primary'
  if (s === 'rejected' || s === 'cancelled') color = 'bg-red-50 text-red-700'
  if (s === 'shortlisted') color = 'bg-indigo-50 text-indigo-700'
  if (s === 'in_progress' || s === 'hirer_signed' || s === 'provider_signed') color = 'bg-cyan-50 text-cyan-700'
  if (s === 'withdrawn') color = 'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${color}`}>
      {(status || 'N/A').replace(/_/g, ' ')}
    </span>
  )
}

function UrgencyBadge({ urgency }: { urgency?: string }) {
  if (!urgency || urgency === 'standard') return null
  const cfg = URGENCY_LEVELS.find(u => u.value === urgency)
  const icon = urgency === 'emergency' ? <AlertTriangle className="h-3 w-3" /> : <Zap className="h-3 w-3" />
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cfg?.color || 'bg-gray-100 text-gray-600'}`}>
      {icon}
      {urgency}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState({ icon: Icon, title, message, action }: {
  icon: typeof Briefcase
  title: string
  message: string
  action?: React.ReactNode
}) {
  return (
    <div className="py-16 text-center">
      <Icon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {action}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function JobBoardPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { gate, showModal: showVerifyModal, setShowModal: setShowVerifyModal } = useVerificationGate()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('browse')

  // Browse filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterParish, setFilterParish] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const [showBidForm, setShowBidForm] = useState<string | null>(null)

  // My Posts: expanded job to view bids
  const [viewBidsJobId, setViewBidsJobId] = useState<string | null>(null)

  // Create Job form
  const [jobForm, setJobForm] = useState<{
    title: string; description: string; category: string; subcategory: string
    parish: string; location_text: string; budget_min: string; budget_max: string
    open_to_bids: boolean; deadline: string; bid_deadline: string; urgency: string
    required_skills: string; attachments: File[]
  }>({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    parish: '',
    location_text: '',
    budget_min: '',
    budget_max: '',
    open_to_bids: false,
    deadline: '',
    bid_deadline: '',
    urgency: 'standard',
    required_skills: '',
    attachments: [],
  })

  // Bid form
  const [bidForm, setBidForm] = useState({
    amount: '',
    proposal: '',
    estimated_duration_days: '',
    available_start_date: '',
  })

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  const { data: jobsData, isLoading: jobsLoading } = useQuery<JobPost[]>({
    queryKey: ['jobs-browse', filterCategory, filterParish, sortBy, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('status', 'open')
      if (filterCategory) params.set('category', filterCategory)
      if (filterParish) params.set('parish', filterParish)
      if (sortBy) params.set('sort_by', sortBy)
      if (searchQuery) params.set('search', searchQuery)
      const res = await apiGet(`/api/bidding/posts?${params.toString()}`, token)
      return Array.isArray(res) ? res : res?.items || res?.posts || []
    },
    enabled: !!token && activeTab === 'browse',
  })

  const { data: myPostsData, isLoading: myPostsLoading } = useQuery<JobPost[]>({
    queryKey: ['my-posts'],
    queryFn: async () => {
      const res = await apiGet('/api/bidding/my-posts', token)
      return Array.isArray(res) ? res : res?.items || res?.posts || []
    },
    enabled: !!token && activeTab === 'my-posts',
  })

  const { data: myBidsData, isLoading: bidsLoading } = useQuery<BidItem[]>({
    queryKey: ['my-bids'],
    queryFn: async () => {
      const res = await apiGet('/api/bidding/my-bids', token)
      return Array.isArray(res) ? res : res?.items || res?.bids || []
    },
    enabled: !!token && activeTab === 'my-bids',
  })

  const { data: contractsData, isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: async () => {
      const res = await apiGet('/api/bidding/contracts', token)
      return Array.isArray(res) ? res : res?.items || res?.contracts || []
    },
    enabled: !!token && activeTab === 'contracts',
  })

  // Job detail query (for expanded view)
  const { data: expandedJobDetail } = useQuery<JobPost>({
    queryKey: ['job-detail', expandedJobId],
    queryFn: async () => {
      const res = await apiGet(`/api/bidding/${expandedJobId}`, token)
      return res
    },
    enabled: !!token && !!expandedJobId,
  })

  // Bids on a specific job post (for My Posts tab)
  const { data: jobBidsData, isLoading: jobBidsLoading } = useQuery<BidItem[]>({
    queryKey: ['job-bids', viewBidsJobId],
    queryFn: async () => {
      const res = await apiGet(`/api/bidding/${viewBidsJobId}/bids`, token)
      return Array.isArray(res) ? res : res?.items || res?.bids || []
    },
    enabled: !!token && !!viewBidsJobId,
  })

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const createJobMutation = useMutation({
    mutationFn: (data: typeof jobForm) => {
      const payload: Record<string, unknown> = {
        title: data.title,
        description: data.description,
        category: data.category,
        parish: data.parish || undefined,
        location_text: data.location_text || undefined,
        subcategory: data.subcategory || undefined,
        required_skills: data.required_skills ? data.required_skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        deadline: data.deadline || undefined,
        bid_deadline: data.bid_deadline || undefined,
      }
      if (!data.open_to_bids) {
        if (data.budget_min) payload.budget_min = parseFloat(data.budget_min)
        if (data.budget_max) payload.budget_max = parseFloat(data.budget_max)
      }
      return apiPost('/api/bidding/', payload, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs-browse'] })
      queryClient.invalidateQueries({ queryKey: ['my-posts'] })
      toast({ title: 'Job post created!' })
      setShowCreateModal(false)
      setJobForm({
        title: '', description: '', category: '', subcategory: '', parish: '',
        location_text: '', budget_min: '', budget_max: '', open_to_bids: false,
        deadline: '', bid_deadline: '', urgency: 'standard', required_skills: '',
        attachments: [],
      })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to create post',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  const bidMutation = useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: typeof bidForm }) =>
      apiPost(`/api/bidding/${jobId}/bids`, {
        amount: parseFloat(data.amount),
        proposal: data.proposal,
        estimated_duration_days: data.estimated_duration_days ? parseInt(data.estimated_duration_days) : undefined,
        available_start_date: data.available_start_date || undefined,
      }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bids'] })
      queryClient.invalidateQueries({ queryKey: ['jobs-browse'] })
      queryClient.invalidateQueries({ queryKey: ['job-detail'] })
      toast({ title: 'Bid submitted!' })
      setShowBidForm(null)
      setBidForm({ amount: '', proposal: '', estimated_duration_days: '', available_start_date: '' })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to submit bid',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  const bidStatusMutation = useMutation({
    mutationFn: ({ jobId, bidId, status: newStatus }: { jobId: string; bidId: string; status: string }) =>
      apiPut(`/api/bidding/${jobId}/bids/${bidId}/status`, { status: newStatus }, token),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job-bids', variables.jobId] })
      queryClient.invalidateQueries({ queryKey: ['my-posts'] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast({ title: `Bid ${variables.status}!` })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to update bid',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const jobs = jobsData || []
  const myPosts = myPostsData || []
  const myBids = myBidsData || []
  const contracts = contractsData || []
  const jobBids = jobBidsData || []

  const isLoading =
    (activeTab === 'browse' && jobsLoading) ||
    (activeTab === 'my-posts' && myPostsLoading) ||
    (activeTab === 'my-bids' && bidsLoading) ||
    (activeTab === 'contracts' && contractsLoading)

  const tabs: { key: TabKey; label: string; icon: typeof Briefcase }[] = [
    { key: 'browse', label: 'Browse Jobs', icon: Search },
    { key: 'my-posts', label: 'My Posted Jobs', icon: FileText },
    { key: 'my-bids', label: 'My Bids', icon: Gavel },
    { key: 'contracts', label: 'My Contracts', icon: CheckCircle },
  ]

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SEO
        title="Job Board — Find Work in Jamaica"
        description="Browse and post jobs across Jamaica. Hire trusted service providers or find work opportunities in every parish on Jobsy."
        url="https://jobsyja.com/#/job-board"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Board</h1>
            <p className="text-sm text-gray-500">Find work or hire service providers</p>
          </div>
        </div>
        <button
          onClick={() => gate(() => setShowCreateModal(true))}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Post a Job
        </button>
      </div>

      {/* Verification Gate Modal */}
      <VerificationGateModal isOpen={showVerifyModal} onClose={() => setShowVerifyModal(false)} />

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                setExpandedJobId(null)
                setViewBidsJobId(null)
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div>
            {/* ============================================================= */}
            {/* BROWSE JOBS TAB                                                */}
            {/* ============================================================= */}
            {activeTab === 'browse' && (
              <>
                {/* Search + Filters Bar */}
                <div className="p-4 border-b border-gray-100 space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search jobs by title or description..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                    <button
                      onClick={() => setShowFilters(f => !f)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2.5 border rounded-lg text-sm font-medium transition ${
                        showFilters ? 'border-primary text-primary bg-primary/5' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      Filters
                      {(filterCategory || filterParish) && (
                        <span className="ml-1 w-5 h-5 flex items-center justify-center bg-primary text-white rounded-full text-xs">
                          {(filterCategory ? 1 : 0) + (filterParish ? 1 : 0)}
                        </span>
                      )}
                    </button>
                  </div>

                  {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      {/* Category */}
                      <div className="relative">
                        <select
                          value={filterCategory}
                          onChange={e => setFilterCategory(e.target.value)}
                          className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        >
                          <option value="">All Categories</option>
                          {CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>

                      {/* Parish */}
                      <div className="relative">
                        <select
                          value={filterParish}
                          onChange={e => setFilterParish(e.target.value)}
                          className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        >
                          <option value="">All Parishes</option>
                          {PARISHES.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>

                      {/* Sort */}
                      <div className="relative">
                        <select
                          value={sortBy}
                          onChange={e => setSortBy(e.target.value)}
                          className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        >
                          {SORT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>

                      {/* Clear filters */}
                      {(filterCategory || filterParish || sortBy !== 'newest') && (
                        <button
                          onClick={() => {
                            setFilterCategory('')
                            setFilterParish('')
                            setSortBy('newest')
                          }}
                          className="text-xs text-primary hover:underline self-center"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Job Listings */}
                {jobs.length === 0 ? (
                  <EmptyState
                    icon={Briefcase}
                    title="No jobs found"
                    message="Check back later for new opportunities or adjust your filters"
                  />
                ) : (
                  <div className="divide-y divide-gray-100">
                    {jobs.map(job => (
                      <div key={job.id}>
                        {/* Job Card */}
                        <div
                          className="px-6 py-4 hover:bg-gray-50 transition cursor-pointer"
                          onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold text-gray-900">{job.title}</h3>
                                <StatusBadge status={job.status} />
                                <UrgencyBadge urgency={(job as unknown as Record<string, unknown>).urgency as string} />
                              </div>
                              {job.description && (
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{job.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                                {(job.budget_min != null || job.budget_max != null) && (
                                  <span className="inline-flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {formatBudget(job.budget_min, job.budget_max, job.currency)}
                                  </span>
                                )}
                                {job.category && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                                    <Tag className="h-3 w-3" />
                                    {job.category}
                                  </span>
                                )}
                                {job.parish && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {job.parish}
                                  </span>
                                )}
                                {job.bid_count != null && (
                                  <span className="inline-flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {job.bid_count} bid{job.bid_count !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {job.deadline && (
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Due: {formatDate(job.deadline)}
                                  </span>
                                )}
                                {job.created_at && (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(job.created_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {expandedJobId === job.id ? (
                                <ChevronUp className="h-5 w-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Job Detail + Bid Form */}
                        {expandedJobId === job.id && (
                          <div className="px-6 pb-5 bg-gray-50 border-t border-gray-100">
                            <div className="pt-4 space-y-4">
                              {/* Full description */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Full Description</h4>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                  {(expandedJobDetail?.description || job.description) || 'No description provided.'}
                                </p>
                              </div>

                              {/* Details grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-400 mb-0.5">Budget</p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {formatBudget(
                                      expandedJobDetail?.budget_min ?? job.budget_min,
                                      expandedJobDetail?.budget_max ?? job.budget_max,
                                      job.currency,
                                    )}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-400 mb-0.5">Category</p>
                                  <p className="text-sm font-medium text-gray-900">{job.category || 'N/A'}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-400 mb-0.5">Location</p>
                                  <p className="text-sm font-medium text-gray-900">{job.parish || 'N/A'}</p>
                                  {(expandedJobDetail?.location_text || job.location_text) && (
                                    <p className="text-xs text-gray-500">{expandedJobDetail?.location_text || job.location_text}</p>
                                  )}
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-400 mb-0.5">Deadline</p>
                                  <p className="text-sm font-medium text-gray-900">{formatDate(job.deadline) || 'No deadline'}</p>
                                </div>
                              </div>

                              {/* Required skills */}
                              {(expandedJobDetail?.required_skills || job.required_skills)?.length ? (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-1">Required Skills</h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(expandedJobDetail?.required_skills || job.required_skills)!.map((skill, i) => (
                                      <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {/* Bid submission form */}
                              {expandedJobDetail?.has_bid ? (
                                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <p className="text-sm text-green-700 font-medium">You have already submitted a bid on this job.</p>
                                </div>
                              ) : showBidForm === job.id ? (
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Submit Your Bid</h4>
                                  <form
                                    onSubmit={e => {
                                      e.preventDefault()
                                      bidMutation.mutate({ jobId: job.id, data: bidForm })
                                    }}
                                    className="space-y-3"
                                  >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Proposed Price (JMD) *</label>
                                        <input
                                          type="number"
                                          value={bidForm.amount}
                                          onChange={e => setBidForm(f => ({ ...f, amount: e.target.value }))}
                                          required
                                          placeholder="0.00"
                                          min="1"
                                          step="0.01"
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Timeline (days)</label>
                                        <input
                                          type="number"
                                          value={bidForm.estimated_duration_days}
                                          onChange={e => setBidForm(f => ({ ...f, estimated_duration_days: e.target.value }))}
                                          placeholder="e.g., 7"
                                          min="1"
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Available Start Date</label>
                                      <input
                                        type="date"
                                        value={bidForm.available_start_date}
                                        onChange={e => setBidForm(f => ({ ...f, available_start_date: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Cover Message *</label>
                                      <textarea
                                        value={bidForm.proposal}
                                        onChange={e => setBidForm(f => ({ ...f, proposal: e.target.value }))}
                                        required
                                        rows={4}
                                        placeholder="Explain why you are the best fit for this job, your relevant experience, and approach..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowBidForm(null)
                                          setBidForm({ amount: '', proposal: '', estimated_duration_days: '', available_start_date: '' })
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={bidMutation.isPending}
                                        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                                      >
                                        {bidMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                        <Send className="h-4 w-4" />
                                        Submit Bid
                                      </button>
                                    </div>
                                  </form>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setShowBidForm(job.id)
                                    setBidForm({ amount: '', proposal: '', estimated_duration_days: '', available_start_date: '' })
                                  }}
                                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition"
                                >
                                  <Gavel className="h-4 w-4" />
                                  Place a Bid
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ============================================================= */}
            {/* MY POSTED JOBS TAB                                             */}
            {/* ============================================================= */}
            {activeTab === 'my-posts' && (
              <>
                {myPosts.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No posts yet"
                    message="Create your first job post to start receiving bids"
                    action={
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Post a Job
                      </button>
                    }
                  />
                ) : (
                  <div className="divide-y divide-gray-100">
                    {myPosts.map(post => (
                      <div key={post.id}>
                        {/* Post row */}
                        <div
                          className="px-6 py-4 hover:bg-gray-50 transition cursor-pointer"
                          onClick={() => setViewBidsJobId(viewBidsJobId === post.id ? null : post.id)}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold text-gray-900">{post.title}</h3>
                                <StatusBadge status={post.status} />
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
                                {(post.budget_min != null || post.budget_max != null) && (
                                  <span className="inline-flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {formatBudget(post.budget_min, post.budget_max, post.currency)}
                                  </span>
                                )}
                                {post.category && (
                                  <span className="inline-flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    {post.category}
                                  </span>
                                )}
                                {post.bid_count != null && (
                                  <span className="inline-flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {post.bid_count} bid{post.bid_count !== 1 ? 's' : ''}
                                  </span>
                                )}
                                <span>{formatDate(post.created_at)}</span>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              <span className="text-xs text-gray-400">View bids</span>
                              {viewBidsJobId === post.id ? (
                                <ChevronUp className="h-5 w-5 text-gray-300" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-gray-300" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bids panel */}
                        {viewBidsJobId === post.id && (
                          <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
                            <div className="pt-3">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                Bids Received
                              </h4>
                              {jobBidsLoading ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                </div>
                              ) : jobBids.length === 0 ? (
                                <p className="text-sm text-gray-500 py-4 text-center">No bids received yet.</p>
                              ) : (
                                <div className="space-y-3">
                                  {jobBids.map(bid => (
                                    <div key={bid.id} className="bg-white rounded-lg border border-gray-200 p-4">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          {/* Provider info */}
                                          <div className="flex items-center gap-2 mb-1">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                              {bid.provider_avatar_url ? (
                                                <img src={bid.provider_avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                              ) : (
                                                <Users className="h-4 w-4 text-primary" />
                                              )}
                                            </div>
                                            <div>
                                              <p className="text-sm font-medium text-gray-900">
                                                {bid.provider_display_name || 'Provider'}
                                              </p>
                                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                                {bid.provider_parish && (
                                                  <span className="inline-flex items-center gap-0.5">
                                                    <MapPin className="h-3 w-3" />
                                                    {bid.provider_parish}
                                                  </span>
                                                )}
                                                {(bid.provider_rating_avg != null && bid.provider_rating_avg > 0) && (
                                                  <span className="inline-flex items-center gap-0.5">
                                                    <Star className="h-3 w-3 text-yellow-500" />
                                                    {bid.provider_rating_avg.toFixed(1)} ({bid.provider_review_count})
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Bid details */}
                                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                                            <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                                              <DollarSign className="h-3 w-3" />
                                              ${bid.amount?.toLocaleString()} {bid.currency}
                                            </span>
                                            {bid.estimated_duration_days && (
                                              <span className="inline-flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {bid.estimated_duration_days} day{bid.estimated_duration_days !== 1 ? 's' : ''}
                                              </span>
                                            )}
                                            {bid.available_start_date && (
                                              <span>Available: {formatDate(bid.available_start_date)}</span>
                                            )}
                                            <StatusBadge status={bid.status} />
                                          </div>

                                          {/* Proposal */}
                                          {bid.proposal && (
                                            <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{bid.proposal}</p>
                                          )}
                                        </div>

                                        {/* Accept/Reject buttons */}
                                        {(bid.status === 'submitted' || bid.status === 'shortlisted') && post.status === 'open' && (
                                          <div className="shrink-0 flex flex-col gap-2">
                                            <button
                                              onClick={e => {
                                                e.stopPropagation()
                                                bidStatusMutation.mutate({ jobId: post.id, bidId: bid.id, status: 'accepted' })
                                              }}
                                              disabled={bidStatusMutation.isPending}
                                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                                            >
                                              <ThumbsUp className="h-3 w-3" />
                                              Accept
                                            </button>
                                            <button
                                              onClick={e => {
                                                e.stopPropagation()
                                                bidStatusMutation.mutate({ jobId: post.id, bidId: bid.id, status: 'rejected' })
                                              }}
                                              disabled={bidStatusMutation.isPending}
                                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                                            >
                                              <ThumbsDown className="h-3 w-3" />
                                              Reject
                                            </button>
                                            {bid.status === 'submitted' && (
                                              <button
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  bidStatusMutation.mutate({ jobId: post.id, bidId: bid.id, status: 'shortlisted' })
                                                }}
                                                disabled={bidStatusMutation.isPending}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition disabled:opacity-50"
                                              >
                                                <Star className="h-3 w-3" />
                                                Shortlist
                                              </button>
                                            )}
                                          </div>
                                        )}

                                        {bid.status === 'accepted' && (
                                          <div className="shrink-0">
                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">
                                              <CheckCircle className="h-3 w-3" />
                                              Accepted
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ============================================================= */}
            {/* MY BIDS TAB                                                    */}
            {/* ============================================================= */}
            {activeTab === 'my-bids' && (
              myBids.length === 0 ? (
                <EmptyState
                  icon={Gavel}
                  title="No bids yet"
                  message="Browse jobs and submit bids to start"
                />
              ) : (
                <div className="divide-y divide-gray-100">
                  {myBids.map(bid => (
                    <div key={bid.id} className="px-6 py-4 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {bid.job_post?.title || 'Job Bid'}
                            </h3>
                            <StatusBadge status={bid.status} />
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
                            {bid.amount != null && (
                              <span className="inline-flex items-center gap-1 font-medium text-gray-600">
                                <DollarSign className="h-3 w-3" />
                                ${bid.amount.toLocaleString()} {bid.currency}
                              </span>
                            )}
                            {bid.estimated_duration_days && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {bid.estimated_duration_days} day{bid.estimated_duration_days !== 1 ? 's' : ''}
                              </span>
                            )}
                            {bid.job_post?.category && (
                              <span className="inline-flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {bid.job_post.category}
                              </span>
                            )}
                            <span>{formatDate(bid.created_at)}</span>
                          </div>
                          {bid.proposal && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{bid.proposal}</p>
                          )}
                          {bid.hirer_note && (
                            <p className="text-xs text-gray-500 mt-1 italic">Note from hirer: {bid.hirer_note}</p>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {bid.is_winner && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Winner
                            </span>
                          )}
                          {bid.status === 'accepted' && (
                            <button
                              onClick={() => {
                                setActiveTab('contracts')
                              }}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Contract
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ============================================================= */}
            {/* MY CONTRACTS TAB                                               */}
            {/* ============================================================= */}
            {activeTab === 'contracts' && (
              contracts.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="No contracts"
                  message="Active contracts will appear here after a bid is accepted"
                />
              ) : (
                <div className="divide-y divide-gray-100">
                  {contracts.map(contract => (
                    <div key={contract.id} className="px-6 py-4 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {contract.title || 'Contract'}
                            </h3>
                            <StatusBadge status={contract.status} />
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
                            {contract.agreed_amount != null && (
                              <span className="inline-flex items-center gap-1 font-medium text-gray-600">
                                <DollarSign className="h-3 w-3" />
                                ${contract.agreed_amount.toLocaleString()} {contract.currency}
                              </span>
                            )}
                            {contract.parish && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {contract.parish}
                              </span>
                            )}
                            {contract.start_date && (
                              <span>Start: {formatDate(contract.start_date)}</span>
                            )}
                            {contract.estimated_end_date && (
                              <span>End: {formatDate(contract.estimated_end_date)}</span>
                            )}
                            <span>{formatDate(contract.created_at)}</span>
                          </div>
                          {contract.scope_of_work && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{contract.scope_of_work}</p>
                          )}
                        </div>
                        <a
                          href={`/contracts/${contract.id}`}
                          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* CREATE JOB MODAL                                                   */}
      {/* ================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Post a New Job</h3>
                <p className="text-sm text-gray-500">Fill in the details to find the right service provider</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                createJobMutation.mutate(jobForm)
              }}
              className="space-y-4"
            >
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  value={jobForm.title}
                  onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="e.g., Plumbing repair for kitchen sink"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={jobForm.description}
                  onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Describe the job in detail: what needs to be done, any special requirements, materials needed, etc."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Category + Subcategory */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <div className="relative">
                    <select
                      value={jobForm.category}
                      onChange={e => setJobForm(f => ({ ...f, category: e.target.value }))}
                      required
                      className="w-full appearance-none px-3 py-2.5 pr-8 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                  <input
                    type="text"
                    value={jobForm.subcategory}
                    onChange={e => setJobForm(f => ({ ...f, subcategory: e.target.value }))}
                    placeholder="e.g., Pipe repair"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parish</label>
                  <div className="relative">
                    <select
                      value={jobForm.parish}
                      onChange={e => setJobForm(f => ({ ...f, parish: e.target.value }))}
                      className="w-full appearance-none px-3 py-2.5 pr-8 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    >
                      <option value="">Select parish</option>
                      {PARISHES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address / Location Details</label>
                  <input
                    type="text"
                    value={jobForm.location_text}
                    onChange={e => setJobForm(f => ({ ...f, location_text: e.target.value }))}
                    placeholder="e.g., 12 Hope Road, Kingston"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget (JMD)</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={jobForm.open_to_bids}
                      onChange={e => setJobForm(f => ({ ...f, open_to_bids: e.target.checked, budget_min: '', budget_max: '' }))}
                      className="rounded border-gray-300 text-primary focus:ring-primary/30"
                    />
                    Open to bids (no set budget)
                  </label>
                </div>
                {!jobForm.open_to_bids && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Minimum</label>
                      <input
                        type="number"
                        value={jobForm.budget_min}
                        onChange={e => setJobForm(f => ({ ...f, budget_min: e.target.value }))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Maximum</label>
                      <input
                        type="number"
                        value={jobForm.budget_max}
                        onChange={e => setJobForm(f => ({ ...f, budget_max: e.target.value }))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Deadlines */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Deadline</label>
                  <input
                    type="date"
                    value={jobForm.deadline}
                    onChange={e => setJobForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bid Deadline</label>
                  <input
                    type="date"
                    value={jobForm.bid_deadline}
                    onChange={e => setJobForm(f => ({ ...f, bid_deadline: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Urgency Level</label>
                <div className="flex gap-3">
                  {URGENCY_LEVELS.map(level => (
                    <label
                      key={level.value}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border rounded-lg cursor-pointer text-sm font-medium transition ${
                        jobForm.urgency === level.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="urgency"
                        value={level.value}
                        checked={jobForm.urgency === level.value}
                        onChange={e => setJobForm(f => ({ ...f, urgency: e.target.value }))}
                        className="sr-only"
                      />
                      {level.value === 'urgent' && <Zap className="h-4 w-4" />}
                      {level.value === 'emergency' && <AlertTriangle className="h-4 w-4" />}
                      {level.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Required Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills</label>
                <input
                  type="text"
                  value={jobForm.required_skills}
                  onChange={e => setJobForm(f => ({ ...f, required_skills: e.target.value }))}
                  placeholder="e.g., plumbing, pipe fitting, soldering (comma-separated)"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <p className="text-xs text-gray-400 mt-1">Separate multiple skills with commas</p>
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary/50 transition cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={e => {
                      const files = e.target.files
                      if (files) {
                        setJobForm(f => ({ ...f, attachments: [...(f.attachments || []), ...Array.from(files)] }))
                      }
                    }}
                    className="hidden"
                    id="job-attachments"
                  />
                  <label htmlFor="job-attachments" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-1">
                      <Image className="h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500">Click to upload images or videos</p>
                      <p className="text-xs text-gray-400">Photos of the job, area, or issue (max 10MB images, 100MB videos)</p>
                    </div>
                  </label>
                </div>
                {jobForm.attachments && jobForm.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {jobForm.attachments.map((file: File, i: number) => (
                      <div key={i} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs">
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setJobForm(f => ({ ...f, attachments: f.attachments?.filter((_: File, j: number) => j !== i) }))}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createJobMutation.isPending}
                  className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {createJobMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Post Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
