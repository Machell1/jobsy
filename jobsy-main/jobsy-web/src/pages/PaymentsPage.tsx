import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../lib/api'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import StripeProvider from '../components/StripeProvider'
import {
  CreditCard,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Wallet,
  Building,
  RotateCcw,
  Receipt,
  Trash2,
} from 'lucide-react'

type TabKey = 'transactions' | 'payouts' | 'methods'

interface Transaction {
  id: string
  amount: number
  currency?: string
  status: string
  description?: string
  type?: string
  created_at?: string
  date?: string
  service_cost?: number
  platform_fee?: number
  processing_fee?: number
  refundable?: boolean
}

interface Payout {
  id: string
  amount: number
  currency?: string
  status: string
  method?: string
  created_at?: string
  date?: string
}

interface PaymentMethod {
  id: string
  brand?: string
  last4?: string
  exp_month?: number
  exp_year?: number
  is_default?: boolean
}

function getStatusConfig(status: string) {
  const s = status.toLowerCase()
  if (s === 'completed' || s === 'succeeded' || s === 'paid') {
    return { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Completed' }
  }
  if (s === 'pending' || s === 'processing') {
    return { icon: Clock, color: 'text-yellow-600 bg-yellow-50', label: 'Pending' }
  }
  if (s === 'failed' || s === 'rejected') {
    return { icon: XCircle, color: 'text-red-600 bg-red-50', label: 'Failed' }
  }
  if (s === 'refunded') {
    return { icon: RotateCcw, color: 'text-blue-600 bg-blue-50', label: 'Refunded' }
  }
  return { icon: AlertCircle, color: 'text-gray-600 bg-gray-50', label: status }
}

function formatCurrency(amount: number, currency?: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'JMD',
    minimumFractionDigits: 2,
  }).format(amount)
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

/* ------------------------------------------------------------------ */
/*  Fee Breakdown Component                                           */
/* ------------------------------------------------------------------ */
function FeeBreakdown({
  serviceCost,
  platformFee,
  processingFee,
  currency,
}: {
  serviceCost: number
  platformFee: number
  processingFee: number
  currency?: string
}) {
  const total = serviceCost + platformFee + processingFee
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
      <div className="flex justify-between text-gray-600">
        <span>Service cost</span>
        <span>{formatCurrency(serviceCost, currency)}</span>
      </div>
      <div className="flex justify-between text-gray-600">
        <span>Platform fee</span>
        <span>{formatCurrency(platformFee, currency)}</span>
      </div>
      <div className="flex justify-between text-gray-600">
        <span>Processing fee</span>
        <span>{formatCurrency(processingFee, currency)}</span>
      </div>
      <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-gray-900">
        <span>Total</span>
        <span>{formatCurrency(total, currency)}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add Payment Method Form (uses Stripe Elements)                    */
/* ------------------------------------------------------------------ */
function AddPaymentMethodForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const { token } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsSubmitting(true)
    try {
      // Get a setup intent client secret from the backend
      const { client_secret } = await apiPost(
        '/api/payments/setup-intent',
        {},
        token
      )

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) return

      const { error, setupIntent } = await stripe.confirmCardSetup(client_secret, {
        payment_method: { card: cardElement },
      })

      if (error) {
        toast({ title: 'Error', description: error.message || 'Failed to add card', variant: 'destructive' })
      } else if (setupIntent?.status === 'succeeded') {
        toast({ title: 'Card added', description: 'Your payment method has been saved.' })
        onSuccess()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#1f2937',
                '::placeholder': { color: '#9ca3af' },
              },
              invalid: { color: '#ef4444' },
            },
          }}
        />
      </div>
      <button
        type="submit"
        disabled={!stripe || isSubmitting}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {isSubmitting ? 'Adding...' : 'Add Card'}
      </button>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/*  Setup Payment Account Section                                     */
/* ------------------------------------------------------------------ */
function SetupPaymentAccount() {
  const { token } = useAuth()
  const { toast } = useToast()

  const setupMutation = useMutation({
    mutationFn: async () => {
      return apiPost('/api/payments/accounts/setup', {}, token)
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, '_blank')
      } else {
        toast({ title: 'Account setup initiated', description: 'Your payment account is being configured.' })
      }
    },
    onError: (err: Error) => {
      toast({ title: 'Setup failed', description: err.message, variant: 'destructive' })
    },
  })

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-100 shrink-0">
          <Building className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-900 mb-1">Set Up Payment Account</h3>
          <p className="text-sm text-blue-700 mb-3">
            Connect a payment account to receive payouts for your services.
          </p>
          <button
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {setupMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Building className="h-4 w-4" />
            )}
            {setupMutation.isPending ? 'Setting up...' : 'Connect Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Request Payout Form                                               */
/* ------------------------------------------------------------------ */
function RequestPayoutForm() {
  const { token } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')

  const payoutMutation = useMutation({
    mutationFn: async (payoutAmount: number) => {
      return apiPost('/api/payments/payouts', { amount: payoutAmount }, token)
    },
    onSuccess: () => {
      toast({ title: 'Payout requested', description: 'Your payout request has been submitted.' })
      setAmount('')
      queryClient.invalidateQueries({ queryKey: ['payouts'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Payout failed', description: err.message, variant: 'destructive' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid amount.', variant: 'destructive' })
      return
    }
    payoutMutation.mutate(parsed)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <ArrowUpRight className="h-4 w-4 text-primary" />
        Request Payout
      </h3>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Amount (JMD)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
      </div>
      <button
        type="submit"
        disabled={payoutMutation.isPending || !amount}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
      >
        {payoutMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowUpRight className="h-4 w-4" />
        )}
        {payoutMutation.isPending ? 'Submitting...' : 'Request Payout'}
      </button>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/*  Inner Payments Content (has access to Stripe hooks)               */
/* ------------------------------------------------------------------ */
function PaymentsContent() {
  const { token } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('transactions')
  const [showAddCard, setShowAddCard] = useState(false)
  const [expandedTx, setExpandedTx] = useState<string | null>(null)

  const { data: transactionsData, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await apiGet('/api/payments/transactions?limit=50', token)
      return Array.isArray(res) ? res : res?.items || res?.transactions || []
    },
    enabled: !!token && activeTab === 'transactions',
  })

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery<Payout[]>({
    queryKey: ['payouts'],
    queryFn: async () => {
      const res = await apiGet('/api/payments/payouts?limit=50', token)
      return Array.isArray(res) ? res : res?.items || res?.payouts || []
    },
    enabled: !!token && activeTab === 'payouts',
  })

  const { data: methodsData, isLoading: methodsLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await apiGet('/api/payments/methods', token)
      return Array.isArray(res) ? res : res?.items || res?.methods || []
    },
    enabled: !!token && activeTab === 'methods',
  })

  const refundMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      return apiPost(`/api/payments/transactions/${transactionId}/refund`, {}, token)
    },
    onSuccess: () => {
      toast({ title: 'Refund requested', description: 'Your refund has been submitted for processing.' })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Refund failed', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMethodMutation = useMutation({
    mutationFn: async (methodId: string) => {
      return apiPost(`/api/payments/methods/${methodId}/detach`, {}, token)
    },
    onSuccess: () => {
      toast({ title: 'Card removed', description: 'Payment method has been removed.' })
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const transactions = transactionsData || []
  const payouts = payoutsData || []
  const methods = methodsData || []

  const tabs: { key: TabKey; label: string; icon: typeof CreditCard }[] = [
    { key: 'transactions', label: 'Transactions', icon: DollarSign },
    { key: 'payouts', label: 'Payouts', icon: ArrowUpRight },
    { key: 'methods', label: 'Payment Methods', icon: CreditCard },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500">Manage your transactions and payment methods</p>
        </div>
      </div>

      {/* Setup Payment Account */}
      <SetupPaymentAccount />

      {/* Request Payout */}
      <RequestPayoutForm />

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-0">
          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <>
              {txLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-16 text-center">
                  <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions</h3>
                  <p className="text-sm text-gray-500">Your transaction history will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {transactions.map(tx => {
                    const statusConfig = getStatusConfig(tx.status)
                    const isCredit = tx.type === 'credit' || tx.type === 'income' || tx.amount > 0
                    const isExpanded = expandedTx === tx.id
                    const hasFees = tx.service_cost != null || tx.platform_fee != null || tx.processing_fee != null
                    const isRefundable = tx.refundable !== false && (tx.status === 'completed' || tx.status === 'succeeded' || tx.status === 'paid')

                    return (
                      <div key={tx.id}>
                        <div
                          className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition"
                          onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                        >
                          <div className={`p-2 rounded-lg ${isCredit ? 'bg-green-50' : 'bg-gray-50'}`}>
                            {isCredit ? (
                              <ArrowDownLeft className="h-5 w-5 text-green-600" />
                            ) : (
                              <ArrowUpRight className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {tx.description || 'Transaction'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDate(tx.created_at || tx.date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${isCredit ? 'text-green-600' : 'text-gray-900'}`}>
                              {isCredit ? '+' : '-'}{formatCurrency(Math.abs(tx.amount), tx.currency)}
                            </p>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusConfig.color}`}>
                              <statusConfig.icon className="h-3 w-3" />
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-6 pb-4 space-y-3">
                            {hasFees && (
                              <FeeBreakdown
                                serviceCost={tx.service_cost || Math.abs(tx.amount)}
                                platformFee={tx.platform_fee || 0}
                                processingFee={tx.processing_fee || 0}
                                currency={tx.currency}
                              />
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Receipt className="h-3.5 w-3.5" />
                              <span>ID: {tx.id}</span>
                            </div>
                            {isRefundable && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!window.confirm('Are you sure you want to request a refund?')) return
                                  refundMutation.mutate(tx.id)
                                }}
                                disabled={refundMutation.isPending}
                                className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium transition"
                              >
                                {refundMutation.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5" />
                                )}
                                Request Refund
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            <>
              {payoutsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : payouts.length === 0 ? (
                <div className="py-16 text-center">
                  <ArrowUpRight className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No payouts</h3>
                  <p className="text-sm text-gray-500">Your payout history will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {payouts.map(payout => {
                    const statusConfig = getStatusConfig(payout.status)
                    return (
                      <div key={payout.id} className="px-6 py-4 flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <ArrowUpRight className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            Payout {payout.method ? `via ${payout.method}` : ''}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(payout.created_at || payout.date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(payout.amount, payout.currency)}
                          </p>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusConfig.color}`}>
                            <statusConfig.icon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Payment Methods Tab */}
          {activeTab === 'methods' && (
            <div className="p-6 space-y-6">
              {methodsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Saved cards */}
                  {methods.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900">Saved Cards</h3>
                      {methods.map(method => (
                        <div
                          key={method.id}
                          className="flex items-center gap-3 border border-gray-200 rounded-lg p-4"
                        >
                          <CreditCard className="h-5 w-5 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {method.brand || 'Card'} ending in {method.last4 || '****'}
                            </p>
                            {method.exp_month && method.exp_year && (
                              <p className="text-xs text-gray-400">
                                Expires {String(method.exp_month).padStart(2, '0')}/{method.exp_year}
                              </p>
                            )}
                          </div>
                          {method.is_default && (
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              Default
                            </span>
                          )}
                          <button
                            onClick={() => deleteMethodMutation.mutate(method.id)}
                            disabled={deleteMethodMutation.isPending}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition"
                            title="Remove card"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <CreditCard className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No payment methods saved yet</p>
                    </div>
                  )}

                  {/* Add card toggle */}
                  {!showAddCard ? (
                    <button
                      onClick={() => setShowAddCard(true)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      Add Payment Method
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Add New Card</h3>
                        <button
                          onClick={() => setShowAddCard(false)}
                          className="text-xs text-gray-500 hover:text-gray-700 transition"
                        >
                          Cancel
                        </button>
                      </div>
                      <AddPaymentMethodForm
                        onSuccess={() => {
                          setShowAddCard(false)
                          queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Export (wraps with StripeProvider)                            */
/* ------------------------------------------------------------------ */
export default function PaymentsPage() {
  return (
    <StripeProvider>
      <PaymentsContent />
    </StripeProvider>
  )
}
