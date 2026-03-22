import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiUpload } from '../lib/api'
import SEO from '../components/SEO'
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
  AlertTriangle,
  Upload,
  Camera,
  ChevronLeft,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────

interface VerificationStatus {
  is_verified: boolean
  progress: number
  badges: Record<string, string>
  missing: string[]
}

interface BadgeStep {
  key: string
  label: string
  icon: LucideIcon
  description: string
  actionLabel: string
  type: 'otp' | 'upload' | 'camera'
  uploadFolder?: string
  otpEndpoint?: string
  acceptedFiles?: string
}

// ── Verification steps per account type ─────────────────────────────────

const ADDRESS_STEP: BadgeStep = {
  key: 'address_verified',
  label: 'Address',
  icon: MapPin,
  description: 'Upload a utility bill or bank statement dated within the last 3 months. Screenshots and digitally edited documents are not accepted — original PDFs or photos of physical documents only.',
  actionLabel: 'Upload Proof of Address',
  type: 'upload',
  uploadFolder: 'verification/address',
  acceptedFiles: '.pdf,.jpg,.jpeg,.png',
}

const INDIVIDUAL_STEPS: BadgeStep[] = [
  {
    key: 'phone_verified', label: 'Phone', icon: Phone,
    description: 'Verify your phone number via SMS code',
    actionLabel: 'Verify Phone', type: 'otp', otpEndpoint: '/api/verification/phone/send',
  },
  {
    key: 'email_verified', label: 'Email', icon: Mail,
    description: 'Verify your email address via code',
    actionLabel: 'Verify Email', type: 'otp', otpEndpoint: '/api/verification/email/send',
  },
  {
    key: 'id_verified', label: 'Government ID', icon: Shield,
    description: 'Upload a government-issued ID (TRN, passport, or driver\'s licence)',
    actionLabel: 'Upload ID', type: 'upload', uploadFolder: 'verification/id',
    acceptedFiles: '.pdf,.jpg,.jpeg,.png',
  },
  {
    key: 'face_verified', label: 'Face Scan', icon: ScanFace,
    description: 'Take a selfie to match your ID photo',
    actionLabel: 'Start Face Scan', type: 'camera',
  },
  ADDRESS_STEP,
]

const ORGANIZATION_STEPS: BadgeStep[] = [
  {
    key: 'phone_verified', label: 'Phone', icon: Phone,
    description: 'Verify your business phone number',
    actionLabel: 'Verify Phone', type: 'otp', otpEndpoint: '/api/verification/phone/send',
  },
  {
    key: 'email_verified', label: 'Email', icon: Mail,
    description: 'Verify your business email address',
    actionLabel: 'Verify Email', type: 'otp', otpEndpoint: '/api/verification/email/send',
  },
  {
    key: 'company_docs', label: 'Company Docs', icon: FileText,
    description: 'Upload Certificate of Incorporation, TRN, or business registration',
    actionLabel: 'Upload Documents', type: 'upload', uploadFolder: 'verification/company',
    acceptedFiles: '.pdf,.jpg,.jpeg,.png',
  },
  {
    key: 'business_background', label: 'Background', icon: UserCheck,
    description: 'Complete business background verification',
    actionLabel: 'Upload Documents', type: 'upload', uploadFolder: 'verification/background',
    acceptedFiles: '.pdf,.jpg,.jpeg,.png',
  },
  ADDRESS_STEP,
]

const SCHOOL_STEPS: BadgeStep[] = [
  {
    key: 'phone_verified', label: 'Phone', icon: Phone,
    description: 'Verify your school phone number',
    actionLabel: 'Verify Phone', type: 'otp', otpEndpoint: '/api/verification/phone/send',
  },
  {
    key: 'email_verified', label: 'Email', icon: Mail,
    description: 'Verify your school email address',
    actionLabel: 'Verify Email', type: 'otp', otpEndpoint: '/api/verification/email/send',
  },
  {
    key: 'school_registration', label: 'School Registration', icon: GraduationCap,
    description: 'Upload Ministry of Education registration or school charter',
    actionLabel: 'Upload Registration', type: 'upload', uploadFolder: 'verification/school',
    acceptedFiles: '.pdf,.jpg,.jpeg,.png',
  },
  {
    key: 'authorized_rep', label: 'Representative', icon: UserCheck,
    description: 'Verify authorized representative identity',
    actionLabel: 'Upload ID', type: 'upload', uploadFolder: 'verification/rep',
    acceptedFiles: '.pdf,.jpg,.jpeg,.png',
  },
  ADDRESS_STEP,
]

const HIRER_STEPS: BadgeStep[] = [
  {
    key: 'phone_verified', label: 'Phone', icon: Phone,
    description: 'Verify your phone number via SMS code',
    actionLabel: 'Verify Phone', type: 'otp', otpEndpoint: '/api/verification/phone/send',
  },
  {
    key: 'email_verified', label: 'Email', icon: Mail,
    description: 'Verify your email address via code',
    actionLabel: 'Verify Email', type: 'otp', otpEndpoint: '/api/verification/email/send',
  },
  {
    key: 'id_verified', label: 'Government ID', icon: Shield,
    description: 'Upload a government-issued ID (TRN, passport, or driver\'s licence)',
    actionLabel: 'Upload ID', type: 'upload', uploadFolder: 'verification/id',
    acceptedFiles: '.pdf,.jpg,.jpeg,.png',
  },
  ADDRESS_STEP,
]

const REQUIRED_MAP: Record<string, string[]> = {
  individual_provider: ['phone_verified', 'email_verified', 'id_verified', 'face_verified', 'address_verified'],
  individual_hirer: ['phone_verified', 'email_verified', 'id_verified', 'address_verified'],
  organization_provider: ['phone_verified', 'email_verified', 'company_docs', 'address_verified'],
  organization_hirer: ['phone_verified', 'email_verified', 'company_docs', 'address_verified'],
  school_provider: ['phone_verified', 'email_verified', 'school_registration', 'address_verified'],
  school_hirer: ['phone_verified', 'email_verified', 'school_registration', 'address_verified'],
}

function getStepsForUser(user: Record<string, unknown> | null): { steps: BadgeStep[]; required: string[] } {
  const accountType = (user?.account_type as string) || (user?.accountType as string) || 'individual'
  const role = (user?.active_role as string) || (user?.role as string) || 'customer'
  const isHirer = role === 'customer' || role === 'hirer'

  const key = `${accountType}_${isHirer ? 'hirer' : 'provider'}`
  const required = REQUIRED_MAP[key] || REQUIRED_MAP.individual_hirer

  if (accountType === 'organization') return { steps: ORGANIZATION_STEPS, required }
  if (accountType === 'school') return { steps: SCHOOL_STEPS, required }
  if (isHirer) return { steps: HIRER_STEPS, required }
  return { steps: INDIVIDUAL_STEPS, required }
}

// ── OTP Modal ───────────────────────────────────────────────────────────

function OtpModal({
  step,
  token,
  onClose,
  onSuccess,
}: {
  step: BadgeStep
  token: string | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMutation = useMutation({
    mutationFn: () => apiPost(step.otpEndpoint!, undefined, token),
    onSuccess: () => {
      setSent(true)
      setError(null)
    },
    onError: (err: Error) => setError(err.message || 'Failed to send code'),
  })

  const verifyEndpoint = step.key === 'phone_verified'
    ? '/api/verification/phone/verify'
    : '/api/verification/email/verify'

  const verifyMutation = useMutation({
    mutationFn: () => apiPost(verifyEndpoint, { code: otp }, token),
    onSuccess: () => {
      onSuccess()
      onClose()
    },
    onError: (err: Error) => setError(err.message || 'Invalid code'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <step.icon className="h-5 w-5 text-primary" />
          {step.label} Verification
        </h2>

        {!sent ? (
          <>
            <p className="text-sm text-gray-600">{step.description}</p>
            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Cancel
              </button>
              <button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {sendMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Code
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              We sent a verification code to your {step.key === 'phone_verified' ? 'phone' : 'email'}. Enter it below.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit code"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              autoFocus
            />
            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => { setSent(false); setError(null); sendMutation.mutate() }}
                disabled={sendMutation.isPending}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                Resend Code
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending || otp.length < 4}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {verifyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Verification Step Card ──────────────────────────────────────────────

function StepCard({
  step,
  status,
  isRequired,
  token,
  onRefresh,
}: {
  step: BadgeStep
  status: string
  isRequired: boolean
  token: string | null
  onRefresh: () => void
}) {
  const [showOtp, setShowOtp] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const queryClient = useQueryClient()

  const Icon = step.icon

  const statusBg = status === 'approved'
    ? 'bg-green-50 border-green-200'
    : status === 'pending'
    ? 'bg-yellow-50 border-yellow-200'
    : status === 'rejected'
    ? 'bg-red-50 border-red-200'
    : 'bg-white border-gray-200'

  const statusLabel = status === 'approved'
    ? 'Verified'
    : status === 'pending'
    ? 'Under Review'
    : status === 'rejected'
    ? 'Rejected — Please Resubmit'
    : 'Not Started'

  const StatusIcon = status === 'approved'
    ? CheckCircle
    : status === 'pending'
    ? Clock
    : status === 'rejected'
    ? XCircle
    : AlertTriangle

  const statusColor = status === 'approved'
    ? 'text-green-600'
    : status === 'pending'
    ? 'text-yellow-600'
    : status === 'rejected'
    ? 'text-red-600'
    : 'text-gray-400'

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadError(null)
    setUploadProgress(0)
    try {
      await apiUpload(
        `/api/verification/${step.key}/upload`,
        file,
        step.uploadFolder || 'verification',
        token,
        setUploadProgress,
      )
      setUploadProgress(null)
      queryClient.invalidateQueries({ queryKey: ['verification-status'] })
      onRefresh()
    } catch (err) {
      setUploadProgress(null)
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }
  }, [step, token, queryClient, onRefresh])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    e.target.value = ''
  }

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }, [cameraStream])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      })
      setCameraStream(stream)
      setShowCamera(true)
      // Attach stream to video after render
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
    } catch {
      setUploadError('Camera access denied. Please allow camera access and try again.')
    }
  }, [])

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    stopCamera()

    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'face-scan.jpg', { type: 'image/jpeg' })
      await handleFileUpload(file)
    }, 'image/jpeg', 0.9)
  }, [stopCamera, handleFileUpload])

  const handleAction = () => {
    if (status === 'approved') return
    if (step.type === 'otp') {
      setShowOtp(true)
    } else if (step.type === 'camera') {
      startCamera()
    } else {
      fileInputRef.current?.click()
    }
  }

  const canAct = status !== 'approved' && status !== 'pending'

  return (
    <>
      <div className={`rounded-xl border p-5 transition-shadow hover:shadow-md ${statusBg}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${
            status === 'approved' ? 'bg-green-100' :
            status === 'pending' ? 'bg-yellow-100' :
            status === 'rejected' ? 'bg-red-100' :
            'bg-gray-100'
          }`}>
            <Icon className={`h-6 w-6 ${statusColor}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">
                {step.label}
                {isRequired && status !== 'approved' && (
                  <span className="ml-1 text-red-400 text-xs">Required</span>
                )}
              </h3>
              <StatusIcon className={`h-4 w-4 ${statusColor} shrink-0`} />
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{step.description}</p>
            <p className={`text-xs font-medium mt-1 ${statusColor}`}>{statusLabel}</p>

            {uploadProgress !== null && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
              </div>
            )}

            {uploadError && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mt-2">{uploadError}</p>
            )}
          </div>

          {canAct && (
            <button
              onClick={handleAction}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition"
            >
              {step.type === 'camera' ? (
                <Camera className="h-4 w-4" />
              ) : step.type === 'upload' ? (
                <Upload className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {step.actionLabel}
            </button>
          )}
        </div>

        {/* Hidden file input for upload steps */}
        {step.type === 'upload' && (
          <input
            ref={fileInputRef}
            type="file"
            accept={step.acceptedFiles}
            onChange={handleFileChange}
            className="hidden"
          />
        )}
      </div>

      {/* Camera modal for face scan */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Face Scan
            </h2>
            <p className="text-sm text-gray-600">
              Position your face in the center of the frame. Ensure good lighting and remove sunglasses or hats.
            </p>
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-60 border-2 border-white/40 rounded-[50%]" />
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-end gap-2">
              <button onClick={stopCamera} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP modal */}
      {showOtp && (
        <OtpModal
          step={step}
          token={token}
          onClose={() => setShowOtp(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['verification-status'] })
            onRefresh()
          }}
        />
      )}
    </>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function VerifyAccountPage() {
  const { token, user } = useAuth()
  const queryClient = useQueryClient()

  const { data: verificationData, isLoading, refetch } = useQuery<VerificationStatus>({
    queryKey: ['verification-status'],
    queryFn: () => apiGet('/api/verification/status', token),
    enabled: !!token,
    retry: 1,
    staleTime: 30_000,
  })

  const { steps, required } = getStepsForUser(user as Record<string, unknown> | null)
  const badges: Record<string, string> = verificationData?.badges || {}
  const approvedCount = steps.filter(s => badges[s.key] === 'approved').length
  const progress = verificationData?.progress ?? Math.round((approvedCount / steps.length) * 100)
  const isVerified = verificationData?.is_verified ?? (required.every(b => badges[b] === 'approved'))

  const handleRefresh = () => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['verification-status'] })
  }

  const progressBarColor = isVerified
    ? 'bg-green-500'
    : progress >= 60
    ? 'bg-amber-500'
    : 'bg-red-400'

  return (
    <>
      <SEO
        title="Verify Your Account | Jobsy"
        description="Complete your Jobsy account verification to post jobs, submit bids, and enter contracts."
      />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back link */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Account</h1>
          <p className="text-gray-600 mt-1">
            Complete each step below to fully verify your account. Verified accounts can post jobs, submit bids, and enter contracts.
          </p>
        </div>

        {/* Progress section */}
        <div className={`rounded-xl border p-5 ${isVerified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isVerified ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <h2 className="text-sm font-semibold text-gray-900">
                {isVerified ? 'Account Verified' : 'Verification Progress'}
              </h2>
            </div>
            <span className={`text-lg font-bold ${isVerified ? 'text-green-600' : 'text-amber-700'}`}>
              {progress}%
            </span>
          </div>
          <div className="h-3 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${progressBarColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {isVerified
              ? 'Your account is fully verified. You have access to all platform features.'
              : `${approvedCount} of ${steps.length} steps completed. Complete all required steps to get verified.`
            }
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-gray-600">Loading verification status...</span>
          </div>
        )}

        {/* Step cards */}
        {!isLoading && (
          <div className="space-y-4">
            {steps.map((step) => (
              <StepCard
                key={step.key}
                step={step}
                status={badges[step.key] || 'missing'}
                isRequired={required.includes(step.key)}
                token={token}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}

        {/* Info note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">Why verification matters</p>
          <p>
            Verification protects everyone on Jobsy. Verified providers get more bookings,
            and verified hirers can enter trusted contracts. All uploaded documents are encrypted
            and handled in compliance with Jamaica's Data Protection Act.
          </p>
        </div>
      </div>
    </>
  )
}
