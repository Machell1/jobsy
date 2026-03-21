import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiGet, apiPost, ApiError } from '../lib/api'
import {
  Copy, Check, Share2, Gift, Users, DollarSign, Loader2, Clock,
  CheckCircle, ArrowRight, ExternalLink,
} from 'lucide-react'

interface ReferralCode {
  code: string | null
  total_referrals: number
  total_rewards_earned: number
}

interface ReferralReward {
  id: string
  referred_user_id: string
  reward_status: string
  reward_amount: number
  created_at: string | null
  completed_at: string | null
  referred_user_display: string
}

interface RewardsData {
  referrals: ReferralReward[]
  total_earned: number
  pending_count: number
  completed_count: number
  total_referrals: number
}

export default function ReferralPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  // Fetch referral code
  const {
    data: codeData,
    isLoading: codeLoading,
    refetch: refetchCode,
  } = useQuery<ReferralCode>({
    queryKey: ['referral-code'],
    queryFn: () => apiGet('/api/referrals/my-code', token),
    enabled: !!token,
  })

  // Fetch rewards
  const { data: rewardsData, isLoading: rewardsLoading } = useQuery<RewardsData>({
    queryKey: ['referral-rewards'],
    queryFn: () => apiGet('/api/referrals/rewards', token),
    enabled: !!token,
  })

  // Generate code mutation
  const generateMutation = useMutation({
    mutationFn: () => apiPost('/api/referrals/generate-code', {}, token),
    onSuccess: () => {
      refetchCode()
      toast({ title: 'Referral code generated!' })
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.detail : 'Failed to generate code'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  const referralCode = codeData?.code
  const referralLink = referralCode
    ? `https://jobsyja.com/register?ref=${referralCode}`
    : ''

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast({ title: 'Copied to clipboard!' })
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast({ title: 'Copy failed', description: text })
    })
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Join Jobsy and find amazing service providers in Jamaica! Use my referral code: ${referralCode}\n\n${referralLink}`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  function shareFacebook() {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      '_blank'
    )
  }

  function shareTwitter() {
    const text = encodeURIComponent(
      `Join Jobsy - Jamaica's premier service marketplace! Use my referral code: ${referralCode}`
    )
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}`,
      '_blank'
    )
  }

  const rewards = rewardsData?.referrals || []

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Gift className="h-7 w-7 text-primary" />
          Refer &amp; Earn
        </h1>
        <p className="text-gray-600 mt-1">
          Invite friends to Jobsy and earn rewards when they complete their first transaction.
        </p>
      </div>

      {/* Referral Code Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Referral Code</h2>

        {codeLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : referralCode ? (
          <div className="space-y-4">
            {/* Code Display */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-50 border-2 border-dashed border-primary/30 rounded-lg px-4 py-3 text-center">
                <span className="text-2xl font-bold tracking-wider text-primary">
                  {referralCode}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(referralCode)}
                className="px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition flex items-center gap-2"
              >
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Referral Link */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Referral Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-600"
                />
                <button
                  onClick={() => copyToClipboard(referralLink)}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  title="Copy link"
                >
                  <Copy className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Share Buttons */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Share via:</p>
              <div className="flex gap-2">
                <button
                  onClick={shareWhatsApp}
                  className="flex-1 py-2.5 rounded-lg bg-green-500 text-white font-medium text-sm hover:bg-green-600 transition flex items-center justify-center gap-2"
                >
                  <WhatsAppIcon />
                  WhatsApp
                </button>
                <button
                  onClick={shareFacebook}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <FacebookIcon />
                  Facebook
                </button>
                <button
                  onClick={shareTwitter}
                  className="flex-1 py-2.5 rounded-lg bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition flex items-center justify-center gap-2"
                >
                  <TwitterIcon />
                  Twitter
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Share2 className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="mt-3 text-gray-500 text-sm">You don't have a referral code yet.</p>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="mt-4 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {generateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate My Code
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {codeData?.total_referrals ?? rewardsData?.total_referrals ?? 0}
              </p>
              <p className="text-xs text-gray-500">Total Referrals</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                ${(codeData?.total_rewards_earned ?? rewardsData?.total_earned ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Total Earnings</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {rewardsData?.pending_count ?? 0}
              </p>
              <p className="text-xs text-gray-500">Pending Rewards</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referred Users List */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Referrals</h2>

        {rewardsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rewards.length > 0 ? (
          <div className="space-y-3">
            {rewards.map(r => (
              <div
                key={r.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.referred_user_display}</p>
                    <p className="text-xs text-gray-500">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString('en-JM', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Unknown date'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      r.reward_status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {r.reward_status === 'completed' ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {r.reward_status === 'completed' ? 'Completed' : 'Pending'}
                  </span>
                  {r.reward_amount > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      ${r.reward_amount.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="mt-3 text-gray-500 text-sm">No referrals yet. Share your code to get started!</p>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto text-lg font-bold">
              1
            </div>
            <h3 className="mt-3 font-semibold text-gray-900 text-sm">Share Your Code</h3>
            <p className="mt-1 text-gray-600 text-xs">
              Share your unique referral code or link with friends, family, or on social media.
            </p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto text-lg font-bold">
              2
            </div>
            <h3 className="mt-3 font-semibold text-gray-900 text-sm">They Sign Up</h3>
            <p className="mt-1 text-gray-600 text-xs">
              Your friend registers on Jobsy using your referral code during sign-up.
            </p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto text-lg font-bold">
              3
            </div>
            <h3 className="mt-3 font-semibold text-gray-900 text-sm">Both Earn Rewards</h3>
            <p className="mt-1 text-gray-600 text-xs">
              When they complete their first transaction, both you and your friend earn rewards!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple inline SVG icons for social platforms
function WhatsAppIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
