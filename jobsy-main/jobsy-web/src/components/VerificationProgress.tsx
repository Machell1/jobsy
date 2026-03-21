import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import {
  Phone,
  Mail,
  Shield,
  Building2,
  GraduationCap,
  UserCheck,
  ScanFace,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface VerificationStatus {
  is_verified: boolean
  progress: number
  badges: Record<string, string>
  missing: string[]
}

// ---------------------------------------------------------------------------
// Dynamic verification steps per account type
// ---------------------------------------------------------------------------

interface BadgeStep {
  key: string
  label: string
  icon: LucideIcon
  description: string
}

// Shared address step — required for ALL account types
const ADDRESS_STEP: BadgeStep = {
  key: 'address_verified', label: 'Address', icon: MapPin,
  description: 'Upload a utility bill or bank statement dated within the last 3 months. Screenshots and digitally edited documents are not accepted — original PDFs or photos of physical documents only.',
}

// Individual providers: phone, email, ID, face scan, address
const INDIVIDUAL_STEPS: BadgeStep[] = [
  { key: 'phone_verified', label: 'Phone', icon: Phone, description: 'Verify your phone number via SMS' },
  { key: 'email_verified', label: 'Email', icon: Mail, description: 'Verify your email address' },
  { key: 'id_verified', label: 'ID', icon: Shield, description: 'Upload government-issued ID (TRN, passport, or driver\'s licence)' },
  { key: 'face_verified', label: 'Face Scan', icon: ScanFace, description: 'Take a selfie to match your ID photo' },
  ADDRESS_STEP,
]
const INDIVIDUAL_REQUIRED = ['phone_verified', 'email_verified', 'id_verified', 'face_verified', 'address_verified']

// Organizations / Businesses: phone, email, company docs, background, address
const ORGANIZATION_STEPS: BadgeStep[] = [
  { key: 'phone_verified', label: 'Phone', icon: Phone, description: 'Verify business phone number' },
  { key: 'email_verified', label: 'Email', icon: Mail, description: 'Verify business email address' },
  { key: 'company_docs', label: 'Company Docs', icon: FileText, description: 'Upload Certificate of Incorporation, TRN, or business registration' },
  { key: 'business_background', label: 'Background', icon: UserCheck, description: 'Complete business background verification' },
  ADDRESS_STEP,
]
const ORGANIZATION_REQUIRED = ['phone_verified', 'email_verified', 'company_docs', 'address_verified']

// Schools: phone, email, school registration, authorized rep, address
const SCHOOL_STEPS: BadgeStep[] = [
  { key: 'phone_verified', label: 'Phone', icon: Phone, description: 'Verify school phone number' },
  { key: 'email_verified', label: 'Email', icon: Mail, description: 'Verify school email address' },
  { key: 'school_registration', label: 'Registration', icon: GraduationCap, description: 'Upload Ministry of Education registration or school charter' },
  { key: 'authorized_rep', label: 'Representative', icon: UserCheck, description: 'Verify authorized representative identity' },
  ADDRESS_STEP,
]
const SCHOOL_REQUIRED = ['phone_verified', 'email_verified', 'school_registration', 'address_verified']

// Hirers (customers): phone, email, ID, address
const HIRER_STEPS: BadgeStep[] = [
  { key: 'phone_verified', label: 'Phone', icon: Phone, description: 'Verify your phone number' },
  { key: 'email_verified', label: 'Email', icon: Mail, description: 'Verify your email address' },
  { key: 'id_verified', label: 'ID', icon: Shield, description: 'Upload government-issued ID' },
  ADDRESS_STEP,
]
const HIRER_REQUIRED = ['phone_verified', 'email_verified', 'id_verified', 'address_verified']

function getStepsForUser(user: any): { steps: BadgeStep[]; required: string[] } {
  const accountType = user?.account_type || user?.accountType || 'individual'
  const role = user?.active_role || user?.role || 'customer'

  // Hirers have simpler verification
  if (role === 'customer' || role === 'hirer') {
    if (accountType === 'organization') return { steps: ORGANIZATION_STEPS, required: ORGANIZATION_REQUIRED }
    if (accountType === 'school') return { steps: SCHOOL_STEPS, required: SCHOOL_REQUIRED }
    return { steps: HIRER_STEPS, required: HIRER_REQUIRED }
  }

  // Providers & advertisers
  if (accountType === 'organization') return { steps: ORGANIZATION_STEPS, required: ORGANIZATION_REQUIRED }
  if (accountType === 'school') return { steps: SCHOOL_STEPS, required: SCHOOL_REQUIRED }
  return { steps: INDIVIDUAL_STEPS, required: INDIVIDUAL_REQUIRED }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />
    case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />
    default: return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
  }
}

interface Props {
  compact?: boolean
  showBanner?: boolean
  onRequestVerification?: (badgeType: string) => void
}

export default function VerificationProgress({ compact = false, showBanner = true, onRequestVerification }: Props) {
  const { token, user } = useAuth()

  const previewMode = !token || typeof token !== 'string' || token.length < 10

  const { data: verificationData } = useQuery<VerificationStatus>({
    queryKey: ['verification-status'],
    queryFn: () => apiGet('/api/verification/status', token),
    enabled: !!token && !previewMode,
    retry: 1,
    staleTime: 60_000,
  })

  const { steps, required } = getStepsForUser(user)
  const badges: Record<string, string> = verificationData?.badges || {}
  const approvedCount = steps.filter(s => badges[s.key] === 'approved').length
  const requiredApproved = required.filter(b => badges[b] === 'approved').length
  const isVerified = verificationData?.is_verified ?? (requiredApproved === required.length)
  const progress = verificationData?.progress ?? Math.round((approvedCount / steps.length) * 100)

  if (isVerified && !compact) return null

  // Build the "you need X, Y, Z" text dynamically
  const missingRequired = required
    .filter(b => badges[b] !== 'approved')
    .map(b => steps.find(s => s.key === b)?.label || b)

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isVerified ? 'bg-green-500' : progress >= 60 ? 'bg-yellow-500' : 'bg-red-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-500">{progress}%</span>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">Complete Your Verification</h3>
          <p className="text-xs text-amber-700 mt-0.5">
            Verify your account to post jobs, submit bids, and enter contracts.
            {missingRequired.length > 0 && (
              <> You need {missingRequired.map((name, i) => (
                <span key={name}>
                  {i > 0 && (i === missingRequired.length - 1 ? ', and ' : ', ')}
                  <strong>{name}</strong>
                </span>
              ))} verification to proceed.</>
            )}
          </p>
        </div>
        <span className="text-sm font-bold text-amber-800">{progress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Badge Steps — dynamic grid based on step count */}
      <div className={`grid gap-2 ${
        steps.length <= 3 ? 'grid-cols-3' :
        steps.length === 4 ? 'grid-cols-4' :
        'grid-cols-5'
      }`}>
        {steps.map((badge) => {
          const status = badges[badge.key] || 'missing'
          const isRequired = required.includes(badge.key)
          const Icon = badge.icon

          return (
            <button
              key={badge.key}
              onClick={() => status === 'missing' && onRequestVerification?.(badge.key)}
              title={badge.description}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-center transition ${
                status === 'approved'
                  ? 'bg-green-50 border border-green-200'
                  : status === 'pending'
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-white border border-gray-200 hover:border-amber-300 cursor-pointer'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${
                  status === 'approved' ? 'text-green-600' :
                  status === 'pending' ? 'text-yellow-600' :
                  'text-gray-400'
                }`} />
                <div className="absolute -top-1 -right-1">
                  {getStatusIcon(status)}
                </div>
              </div>
              <span className={`text-[10px] font-medium leading-tight ${
                status === 'approved' ? 'text-green-700' :
                status === 'pending' ? 'text-yellow-700' :
                'text-gray-500'
              }`}>
                {badge.label}
                {isRequired && status !== 'approved' && <span className="text-red-400">*</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Hook to check if user can perform verified-only actions.
 */
export function useVerificationGate() {
  const { token, user } = useAuth()
  const [showModal, setShowModal] = useState(false)

  const { data } = useQuery<VerificationStatus>({
    queryKey: ['verification-status'],
    queryFn: () => apiGet('/api/verification/status', token),
    enabled: !!token,
    retry: 1,
    staleTime: 60_000,
  })

  const previewMode = typeof window !== 'undefined' && sessionStorage.getItem('jobsy_preview_mode') === 'true'
  const isVerified = previewMode || (data?.is_verified ?? false)

  const gate = (callback: () => void) => {
    if (isVerified) {
      callback()
    } else {
      setShowModal(true)
    }
  }

  return { isVerified, gate, showModal, setShowModal }
}

/**
 * Modal component for verification gate
 */
export function VerificationGateModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Verification Required</h2>
        <p className="text-sm text-gray-600">
          You must complete account verification before you can post jobs, submit bids,
          or enter contracts. This protects all users on the platform.
        </p>
        <VerificationProgress showBanner={false} />
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Close
          </button>
          <a
            href="#/settings"
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition flex items-center gap-1"
          >
            Verify Now <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
