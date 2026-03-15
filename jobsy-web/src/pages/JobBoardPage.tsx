import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, ApiError } from '../lib/api'
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
  Search,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

type TabKey = 'browse' | 'my-posts' | 'my-bids' | 'contracts'

interface JobPost {
  id: string
  title: string
  description?: string
  budget?: number
  currency?: string
  status?: string
  bid_count?: number
  created_at?: string
  date?: string
  parish?: string
  category?: string
  poster_name?: string
  poster_id?: string
}

interface Bid {
  id: string
  job_id?: string
  post_id?: string
  job_title?: string
  amount?: number
  status?: string
  message?: string
  created_at?: string
}

interface Contract {
  id: string
  job_title?: string
  provider_name?: string
  customer_name?: string
  amount?: number
  status?: string
  created_at?: string
}

function formatDate(dateStr?: string): string {
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

function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase()
  let color = 'bg-gray-100 text-gray-600'
  if (s === 'open' || s === 'active') color = 'bg-green-50 text-green-700'
  if (s === 'closed' || s === 'completed') color = 'bg-blue-50 text-blue-700'
  if (s === 'pending') color = 'bg-yellow-50 text-yellow-700'
  if (s === 'accepted') color = 'bg-primary/10 text-primary'
  if (s === 'rejected') color = 'bg-red-50 text-red-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${color}`}>
      {status || 'N/A'}
    </span>
  )
}

export default function JobBoardPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('browse')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBidModal, setShowBidModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Create Job form
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    budget: '',
    category: '',
    parish: '',
  })

  // Bid form
  const [bidForm, setBidForm] = useState({ amount: '', message: '' })

  const { data: jobsData, isLoading: jobsLoading } = useQuery<JobPost[]>({
    queryKey: ['jobs-browse'],
    queryFn: async () => {
      const res = await apiGet('/api/bidding/posts', token)
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

  const { data: myBidsData, isLoading: bidsLoading } = useQuery<Bid[]>({
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

  const createJobMutation = useMutation({
    mutationFn: (data: typeof jobForm) =>
      apiPost('/api/bidding/posts', {
        ...data,
        budget: data.budget ? parseFloat(data.budget) : undefined,
      }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs-browse'] })
      queryClient.invalidateQueries({ queryKey: ['my-posts'] })
      toast({ title: 'Job post created!' })
      setShowCreateModal(false)
      setJobForm({ title: '', description: '', budget: '', category: '', parish: '' })
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
      apiPost(`/api/bidding/posts/${jobId}/bids`, {
        amount: data.amount ? parseFloat(data.amount) : undefined,
        message: data.message,
      }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bids'] })
      toast({ title: 'Bid submitted!' })
      setShowBidModal(false)
      setBidForm({ amount: '', message: '' })
      setSelectedJob(null)
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to submit bid',
        description: error instanceof ApiError ? error.detail : 'An error occurred',
        variant: 'destructive',
      })
    },
  })

  const jobs = jobsData || []
  const myPosts = myPostsData || []
  const myBids = myBidsData || []
  const contracts = contractsData || []

  const filteredJobs = searchQuery
    ? jobs.filter(j =>
        (j.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.category || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : jobs

  const openBidModal = (job: JobPost) => {
    setSelectedJob(job)
    setBidForm({ amount: '', message: '' })
    setShowBidModal(true)
  }

  const tabs: { key: TabKey; label: string; icon: typeof Briefcase }[] = [
    { key: 'browse', label: 'Browse Jobs', icon: Search },
    { key: 'my-posts', label: 'My Posts', icon: FileText },
    { key: 'my-bids', label: 'My Bids', icon: Gavel },
    { key: 'contracts', label: 'Contracts', icon: CheckCircle },
  ]

  const isLoading = (activeTab === 'browse' && jobsLoading) ||
    (activeTab === 'my-posts' && myPostsLoading) ||
    (activeTab === 'my-bids' && bidsLoading) ||
    (activeTab === 'contracts' && contractsLoading)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Post Job
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
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
            {/* Browse Jobs */}
            {activeTab === 'browse' && (
              <>
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search jobs..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>
                {filteredJobs.length === 0 ? (
                  <div className="py-16 text-center">
                    <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No jobs found</h3>
                    <p className="text-sm text-gray-500">Check back later for new opportunities</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredJobs.map(job => (
                      <div key={job.id} className="px-6 py-4 hover:bg-gray-50 transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-gray-900">{job.title}</h3>
                              <StatusBadge status={job.status} />
                            </div>
                            {job.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{job.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                              {job.budget != null && (
                                <span className="inline-flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${job.budget.toLocaleString()}
                                </span>
                              )}
                              {job.category && (
                                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{job.category}</span>
                              )}
                              {job.parish && <span>{job.parish}</span>}
                              {job.bid_count != null && (
                                <span className="inline-flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {job.bid_count} bid{job.bid_count !== 1 ? 's' : ''}
                                </span>
                              )}
                              {(job.created_at || job.date) && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(job.created_at || job.date)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => openBidModal(job)}
                            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition"
                          >
                            <Gavel className="h-3.5 w-3.5" />
                            Bid
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* My Posts */}
            {activeTab === 'my-posts' && (
              myPosts.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No posts yet</h3>
                  <p className="text-sm text-gray-500 mb-4">Create your first job post to get started</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Post Job
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {myPosts.map(post => (
                    <div key={post.id} className="px-6 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">{post.title}</h3>
                            <StatusBadge status={post.status} />
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            {post.budget != null && <span>${post.budget.toLocaleString()}</span>}
                            {post.bid_count != null && (
                              <span>{post.bid_count} bid{post.bid_count !== 1 ? 's' : ''}</span>
                            )}
                            <span>{formatDate(post.created_at || post.date)}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* My Bids */}
            {activeTab === 'my-bids' && (
              myBids.length === 0 ? (
                <div className="py-16 text-center">
                  <Gavel className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No bids yet</h3>
                  <p className="text-sm text-gray-500">Browse jobs and submit bids to start</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {myBids.map(bid => (
                    <div key={bid.id} className="px-6 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{bid.job_title || 'Job Bid'}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            {bid.amount != null && <span>${bid.amount.toLocaleString()}</span>}
                            <StatusBadge status={bid.status} />
                            <span>{formatDate(bid.created_at)}</span>
                          </div>
                          {bid.message && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{bid.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Contracts */}
            {activeTab === 'contracts' && (
              contracts.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No contracts</h3>
                  <p className="text-sm text-gray-500">Active contracts will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {contracts.map(contract => (
                    <div key={contract.id} className="px-6 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {contract.job_title || 'Contract'}
                            </h3>
                            <StatusBadge status={contract.status} />
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            {contract.provider_name && <span>Provider: {contract.provider_name}</span>}
                            {contract.amount != null && <span>${contract.amount.toLocaleString()}</span>}
                            <span>{formatDate(contract.created_at)}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Job Post</h3>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={jobForm.title}
                  onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="e.g., Plumbing repair needed"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={jobForm.description}
                  onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe the job in detail..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget (JMD)</label>
                  <input
                    type="number"
                    value={jobForm.budget}
                    onChange={e => setJobForm(f => ({ ...f, budget: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={jobForm.category}
                    onChange={e => setJobForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="e.g., Plumbing"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parish</label>
                <input
                  type="text"
                  value={jobForm.parish}
                  onChange={e => setJobForm(f => ({ ...f, parish: e.target.value }))}
                  placeholder="e.g., Kingston"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
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
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {createJobMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Post Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bid Modal */}
      {showBidModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Submit Bid</h3>
              <button
                onClick={() => setShowBidModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{selectedJob.title}</p>
              {selectedJob.budget != null && (
                <p className="text-xs text-gray-500 mt-0.5">Budget: ${selectedJob.budget.toLocaleString()}</p>
              )}
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                bidMutation.mutate({ jobId: selectedJob.id, data: bidForm })
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Bid (JMD)</label>
                <input
                  type="number"
                  value={bidForm.amount}
                  onChange={e => setBidForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={bidForm.message}
                  onChange={e => setBidForm(f => ({ ...f, message: e.target.value }))}
                  rows={3}
                  placeholder="Why should the client choose you?"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBidModal(false)}
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
                  Submit Bid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
