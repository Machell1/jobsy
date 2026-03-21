import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiGet, apiPost, ApiError } from '../lib/api'
import {
  FileText,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  PenTool,
  Shield,
  User,
  Calendar,
  MapPin,
  DollarSign,
  Loader2,
  ArrowLeft,
  ScrollText,
} from 'lucide-react'

interface ContractSignature {
  id: string
  contract_id: string
  signer_id: string
  signer_role: string
  signature_method: string
  ip_address: string | null
  user_agent: string | null
  signed_at: string
}

interface Contract {
  id: string
  job_post_id: string
  bid_id: string
  hirer_id: string
  provider_id: string
  title: string
  scope_of_work: string
  agreed_amount: number
  currency: string
  start_date: string | null
  estimated_end_date: string | null
  location_text: string | null
  parish: string | null
  terms_and_conditions: string
  security_number: string | null
  status: string
  contract_pdf_url: string | null
  signed_pdf_url: string | null
  generated_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
  signatures: ContractSignature[]
}

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  pending_signatures: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    label: 'Pending Signatures',
  },
  hirer_signed: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: PenTool,
    label: 'Hirer Signed - Awaiting Provider',
  },
  provider_signed: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: PenTool,
    label: 'Provider Signed - Awaiting Hirer',
  },
  active: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    label: 'Active',
  },
  completed: {
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: CheckCircle,
    label: 'Completed',
  },
  disputed: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertCircle,
    label: 'Disputed',
  },
  cancelled: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    label: 'Cancelled',
  },
}

function getStatusInfo(s: string) {
  return statusConfig[s] || { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Clock, label: s }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'To be agreed'
  try {
    return new Date(dateStr).toLocaleDateString('en-JM', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-JM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ContractPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showTerms, setShowTerms] = useState(false)
  const [signing, setSigning] = useState(false)

  const { data: contract, isLoading, error } = useQuery<Contract>({
    queryKey: ['contract', id],
    queryFn: () => apiGet(`/api/bidding/contracts/${id}`, token),
    enabled: !!token && !!id,
  })

  const signMutation = useMutation({
    mutationFn: () =>
      apiPost(
        `/api/bidding/contracts/${id}/sign`,
        {
          signature_data: `digital_signature_${user?.id || 'unknown'}_${Date.now()}`,
          signature_method: 'digital',
        },
        token
      ),
    onSuccess: () => {
      toast({ title: 'Contract signed successfully!' })
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      setSigning(false)
    },
    onError: (err: ApiError) => {
      toast({ title: err.detail || 'Failed to sign contract', variant: 'destructive' })
      setSigning(false)
    },
  })

  const handleDownloadPdf = async () => {
    try {
      const response = await fetch(`https://api.jobsyja.com/api/bidding/contracts/${id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to download PDF')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contract-${id?.substring(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      toast({ title: 'Failed to download PDF', variant: 'destructive' })
    }
  }

  const handleSign = () => {
    setSigning(true)
    signMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900">Contract not found</h2>
        <p className="text-gray-600">The contract you are looking for does not exist or you do not have access.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  const statusInfo = getStatusInfo(contract.status)
  const StatusIcon = statusInfo.icon
  const currentUserId = user?.id || ''
  const isHirer = contract.hirer_id === currentUserId
  const isProvider = contract.provider_id === currentUserId
  const hasUserSigned = contract.signatures?.some((s) => s.signer_id === currentUserId)
  const canSign =
    !hasUserSigned &&
    (isHirer || isProvider) &&
    ['pending_signatures', 'hirer_signed', 'provider_signed'].includes(contract.status)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{contract.title}</h1>
                {contract.security_number && (
                  <p className="text-sm font-semibold text-green-700 mt-1">
                    Security No: JOBSY-{contract.security_number}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  Ref: {contract.id.substring(0, 8)}...
                </p>
              </div>
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${statusInfo.color}`}
            >
              <StatusIcon className="h-4 w-4" />
              {statusInfo.label}
            </div>
          </div>
        </div>

        {/* Contract details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Parties */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              Parties
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Client (Hirer)</p>
                <p className="font-medium text-gray-900">
                  {contract.hirer_id.substring(0, 8)}...
                  {isHirer && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">You</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Service Provider</p>
                <p className="font-medium text-gray-900">
                  {contract.provider_id.substring(0, 8)}...
                  {isProvider && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">You</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Financial and timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Details
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Agreed Amount</p>
                <p className="font-semibold text-gray-900 text-lg">
                  {formatCurrency(contract.agreed_amount, contract.currency)}
                </p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Start Date
                  </p>
                  <p className="font-medium text-gray-900">{formatDate(contract.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Est. Completion
                  </p>
                  <p className="font-medium text-gray-900">{formatDate(contract.estimated_end_date)}</p>
                </div>
              </div>
              {contract.location_text && (
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location
                  </p>
                  <p className="font-medium text-gray-900">
                    {contract.location_text}
                    {contract.parish ? `, ${contract.parish}` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scope of Work */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-green-600" />
            Scope of Work
          </h2>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {contract.scope_of_work}
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <button
            onClick={() => setShowTerms(!showTerms)}
            className="w-full flex items-center justify-between text-lg font-semibold text-gray-900"
          >
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Terms and Conditions
            </span>
            <span className="text-sm font-normal text-green-600">
              {showTerms ? 'Hide' : 'Show'}
            </span>
          </button>
          {showTerms && (
            <div className="mt-4 prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-4">
              {contract.terms_and_conditions}
            </div>
          )}
        </div>

        {/* Signatures */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PenTool className="h-5 w-5 text-green-600" />
            Signatures
          </h2>
          {contract.signatures && contract.signatures.length > 0 ? (
            <div className="space-y-3">
              {contract.signatures.map((sig) => (
                <div
                  key={sig.id}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{sig.signer_role}</p>
                      <p className="text-sm text-gray-500">
                        Signed on {formatDate(sig.signed_at)} via {sig.signature_method}
                      </p>
                    </div>
                  </div>
                  {sig.signer_id === currentUserId && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Your signature</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No signatures yet. Both parties must sign to activate the contract.</p>
          )}

          {/* Unsigned indicators */}
          {contract.status !== 'active' && contract.status !== 'completed' && (
            <div className="mt-3 space-y-2">
              {!contract.signatures?.some((s) => s.signer_role === 'hirer') && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">Awaiting hirer signature</p>
                </div>
              )}
              {!contract.signatures?.some((s) => s.signer_role === 'provider') && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">Awaiting provider signature</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {canSign && (
            <button
              onClick={handleSign}
              disabled={signing || signMutation.isPending}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signing || signMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <PenTool className="h-5 w-5" />
                  Sign Contract
                </>
              )}
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <Download className="h-5 w-5" />
            Download PDF
          </button>
        </div>

        {/* Generated date */}
        <p className="mt-6 text-center text-sm text-gray-400">
          Generated on {formatDate(contract.generated_at)}
        </p>
      </div>
    </div>
  )
}
