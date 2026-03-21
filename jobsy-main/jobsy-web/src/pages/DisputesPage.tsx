import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiGet, apiPost, ApiError } from '../lib/api'
import MediaUpload from '../components/MediaUpload'
import {
  AlertTriangle, ArrowLeft, Shield, Clock, CheckCircle2,
  MessageSquare, Upload, Loader2, ChevronRight, Scale,
  FileText, Eye, Send, AlertCircle, XCircle,
} from 'lucide-react'

interface Dispute {
  id: string
  contract_id: string
  raiser_id: string
  respondent_id: string
  reason: string
  evidence: string[]
  respondent_statement?: string
  respondent_evidence: string[]
  status: string
  resolution?: string
  outcome?: string
  resolved_by?: string
  escalated: boolean
  created_at: string
  updated_at: string
  resolved_at?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'Open', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  responded: { label: 'Responded', color: 'bg-yellow-100 text-yellow-700', icon: MessageSquare },
  under_review: { label: 'Under Review', color: 'bg-blue-100 text-blue-700', icon: Eye },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
}

const OUTCOME_LABELS: Record<string, string> = {
  refund_full: 'Full Refund to Hirer',
  refund_partial: 'Partial Refund',
  release_to_provider: 'Released to Provider',
  split: 'Split Between Parties',
}

function DisputeStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Dispute List View
// ---------------------------------------------------------------------------

function DisputeList() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const contractId = searchParams.get('contract_id')

  const { data: disputes, isLoading } = useQuery<Dispute[]>({
    queryKey: ['disputes'],
    queryFn: () => apiGet('/api/disputes/', token),
    enabled: !!token,
  })

  const [showRaiseForm, setShowRaiseForm] = useState(!!contractId)
  const [reason, setReason] = useState('')
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([])
  const [raiseContractId, setRaiseContractId] = useState(contractId || '')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const raiseMutation = useMutation({
    mutationFn: (body: { contract_id: string; reason: string; evidence: string[] }) =>
      apiPost('/api/disputes/', body, token),
    onSuccess: () => {
      toast({ title: 'Dispute Raised', description: 'Your dispute has been submitted.' })
      setShowRaiseForm(false)
      setReason('')
      setEvidenceUrls([])
      setRaiseContractId('')
      queryClient.invalidateQueries({ queryKey: ['disputes'] })
    },
    onError: (err) => {
      toast({
        title: 'Error',
        description: err instanceof ApiError ? err.detail : 'Failed to raise dispute',
        variant: 'destructive',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-gray-500 text-sm">Loading disputes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track your contract disputes</p>
        </div>
        <button
          onClick={() => setShowRaiseForm(!showRaiseForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition text-sm"
        >
          <AlertTriangle className="h-4 w-4" />
          Raise Dispute
        </button>
      </div>

      {/* Raise Dispute Form */}
      {showRaiseForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Raise a New Dispute</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract ID</label>
              <input
                type="text"
                value={raiseContractId}
                onChange={(e) => setRaiseContractId(e.target.value)}
                placeholder="Enter the contract ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the issue in detail (minimum 10 characters)"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Evidence (optional)</label>
              <MediaUpload
                type="image"
                folder="disputes"
                onUpload={(url) => setEvidenceUrls(prev => [...prev, url])}
                label="Upload evidence"
              />
              {evidenceUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {evidenceUrls.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt={`Evidence ${i + 1}`} className="h-16 w-16 object-cover rounded border" />
                      <button
                        onClick={() => setEvidenceUrls(prev => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-xs"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => raiseMutation.mutate({
                  contract_id: raiseContractId,
                  reason,
                  evidence: evidenceUrls,
                })}
                disabled={raiseMutation.isPending || !raiseContractId || reason.length < 10}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition text-sm disabled:opacity-50"
              >
                {raiseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Dispute
              </button>
              <button
                onClick={() => setShowRaiseForm(false)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disputes List */}
      {disputes && disputes.length > 0 ? (
        <div className="space-y-3">
          {disputes.map((dispute) => (
            <div
              key={dispute.id}
              onClick={() => navigate(`/disputes/${dispute.id}`)}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary/30 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <Scale className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Contract: {dispute.contract_id.slice(0, 8)}...
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{dispute.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DisputeStatusBadge status={dispute.status} />
                  {dispute.escalated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <AlertTriangle className="h-3 w-3" />
                      Escalated
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(dispute.created_at).toLocaleDateString('en-JM', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
                {dispute.evidence.length > 0 && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {dispute.evidence.length} evidence file{dispute.evidence.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Shield className="h-12 w-12 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No disputes</h3>
          <p className="mt-2 text-gray-500 text-sm">You have no active or past disputes.</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dispute Detail View
// ---------------------------------------------------------------------------

function DisputeDetail({ disputeId }: { disputeId: string }) {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [respondStatement, setRespondStatement] = useState('')
  const [respondEvidence, setRespondEvidence] = useState<string[]>([])

  const { data: dispute, isLoading } = useQuery<Dispute>({
    queryKey: ['dispute', disputeId],
    queryFn: () => apiGet(`/api/disputes/${disputeId}`, token),
    enabled: !!token && !!disputeId,
  })

  const respondMutation = useMutation({
    mutationFn: (body: { statement: string; evidence: string[] }) =>
      apiPost(`/api/disputes/${disputeId}/respond`, body, token),
    onSuccess: () => {
      toast({ title: 'Response Submitted', description: 'Your response has been recorded.' })
      setRespondStatement('')
      setRespondEvidence([])
      queryClient.invalidateQueries({ queryKey: ['dispute', disputeId] })
    },
    onError: (err) => {
      toast({
        title: 'Error',
        description: err instanceof ApiError ? err.detail : 'Failed to submit response',
        variant: 'destructive',
      })
    },
  })

  const escalateMutation = useMutation({
    mutationFn: () => apiPost(`/api/disputes/${disputeId}/escalate`, {}, token),
    onSuccess: () => {
      toast({ title: 'Escalated', description: 'Dispute has been escalated to Jobsy admin.' })
      queryClient.invalidateQueries({ queryKey: ['dispute', disputeId] })
    },
    onError: (err) => {
      toast({
        title: 'Error',
        description: err instanceof ApiError ? err.detail : 'Failed to escalate',
        variant: 'destructive',
      })
    },
  })

  if (isLoading || !dispute) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-gray-500 text-sm">Loading dispute...</p>
      </div>
    )
  }

  const isRespondent = dispute.respondent_id === user?.id
  const isRaiser = dispute.raiser_id === user?.id

  // Timeline events
  const timeline: { label: string; date: string; status: string; detail?: string }[] = [
    { label: 'Dispute Raised', date: dispute.created_at, status: 'completed' },
  ]
  if (dispute.respondent_statement) {
    timeline.push({ label: 'Respondent Replied', date: dispute.updated_at, status: 'completed' })
  }
  if (dispute.escalated) {
    timeline.push({ label: 'Escalated to Admin', date: dispute.updated_at, status: 'completed' })
  }
  if (dispute.status === 'under_review') {
    timeline.push({ label: 'Under Admin Review', date: dispute.updated_at, status: 'active' })
  }
  if (dispute.resolved_at) {
    timeline.push({
      label: 'Resolved',
      date: dispute.resolved_at,
      status: 'completed',
      detail: dispute.outcome ? OUTCOME_LABELS[dispute.outcome] : undefined,
    })
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/disputes')}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Disputes
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">Dispute Details</h1>
              <DisputeStatusBadge status={dispute.status} />
              {dispute.escalated && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  <AlertTriangle className="h-3 w-3" />
                  Escalated
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">Contract: {dispute.contract_id}</p>
          </div>
          {dispute.status !== 'resolved' && (
            <button
              onClick={() => escalateMutation.mutate()}
              disabled={escalateMutation.isPending || dispute.escalated}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition text-sm disabled:opacity-50"
            >
              {escalateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              {dispute.escalated ? 'Already Escalated' : 'Escalate'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Raiser's Case */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Dispute Reason
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">{dispute.reason}</p>
            {dispute.evidence.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Evidence</p>
                <div className="flex flex-wrap gap-2">
                  {dispute.evidence.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`Evidence ${i + 1}`} className="h-20 w-20 object-cover rounded border hover:opacity-80 transition" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Respondent's Response */}
          {dispute.respondent_statement ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                Response
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">{dispute.respondent_statement}</p>
              {dispute.respondent_evidence.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Response Evidence</p>
                  <div className="flex flex-wrap gap-2">
                    {dispute.respondent_evidence.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Response evidence ${i + 1}`} className="h-20 w-20 object-cover rounded border hover:opacity-80 transition" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : isRespondent && dispute.status === 'open' ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                Submit Your Response
              </h2>
              <div className="space-y-4">
                <textarea
                  value={respondStatement}
                  onChange={(e) => setRespondStatement(e.target.value)}
                  placeholder="Provide your side of the story (minimum 10 characters)"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <div>
                  <MediaUpload
                    type="image"
                    folder="disputes"
                    onUpload={(url) => setRespondEvidence(prev => [...prev, url])}
                    label="Upload evidence"
                  />
                  {respondEvidence.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {respondEvidence.map((url, i) => (
                        <img key={i} src={url} alt={`Evidence ${i + 1}`} className="h-16 w-16 object-cover rounded border" />
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => respondMutation.mutate({ statement: respondStatement, evidence: respondEvidence })}
                  disabled={respondMutation.isPending || respondStatement.length < 10}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition text-sm disabled:opacity-50"
                >
                  {respondMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Response
                </button>
              </div>
            </div>
          ) : null}

          {/* Resolution */}
          {dispute.resolution && (
            <div className="bg-white rounded-lg border border-green-200 p-6">
              <h2 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Resolution
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">{dispute.resolution}</p>
              {dispute.outcome && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                  <Scale className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Outcome: {OUTCOME_LABELS[dispute.outcome] || dispute.outcome}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Timeline */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              {timeline.map((event, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full mt-1 ${
                      event.status === 'active' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                    }`} />
                    {i < timeline.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-gray-900">{event.label}</p>
                    {event.detail && <p className="text-xs text-gray-500 mt-0.5">{event.detail}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(event.date).toLocaleDateString('en-JM', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">How disputes work</h4>
            <ul className="text-xs text-blue-700 space-y-1.5">
              <li>1. Raiser submits dispute with evidence</li>
              <li>2. Respondent provides their side</li>
              <li>3. Either party can escalate to admin</li>
              <li>4. Admin reviews and resolves</li>
              <li>5. Escrow updated based on outcome</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component (routes between list and detail)
// ---------------------------------------------------------------------------

export default function DisputesPage() {
  const { id } = useParams<{ id: string }>()

  if (id) {
    return <DisputeDetail disputeId={id} />
  }

  return <DisputeList />
}
