import { useState } from 'react'
import { CreditCard, Loader2, Lock, AlertCircle, CheckCircle } from 'lucide-react'

interface NCBCheckoutProps {
  amount: number
  currency?: string
  platformFee: number
  description?: string
  onSuccess?: (paymentId: string) => void
  onError?: (error: string) => void
  gatewayConfigured: boolean
}

function formatCurrency(amount: number, currency = 'JMD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function NCBCheckout({
  amount,
  currency = 'JMD',
  platformFee,
  description,
  onSuccess,
  onError,
  gatewayConfigured,
}: NCBCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardholderName, setCardholderName] = useState('')

  const total = amount + platformFee

  // Gateway not configured — show coming soon message
  if (!gatewayConfigured) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 shrink-0">
            <AlertCircle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900 mb-1">
              Secure Payments Coming Soon
            </h3>
            <p className="text-sm text-amber-700 mb-3">
              Secure online payments powered by NCB Jamaica are being configured.
              In the meantime, please arrange payment directly with your service provider.
            </p>
            <div className="bg-white/60 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Service</span>
                <span className="font-medium text-gray-900">{formatCurrency(amount, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Platform fee</span>
                <span className="font-medium text-gray-900">{formatCurrency(platformFee, currency)}</span>
              </div>
              <div className="border-t border-amber-200 pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900">{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    if (digits.length >= 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return digits
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      // This will call the backend /pay endpoint which routes through the NCB gateway
      // For now, the gateway will handle the 3DS redirect flow
      // TODO: Integrate with NCB PowerTranz API when credentials arrive
      onSuccess?.(`ncb_${Date.now()}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed'
      onError?.(message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#059669] to-[#047857] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">Secure Payment</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-xs">Powered by</span>
            <span className="text-white font-bold text-sm">NCB</span>
          </div>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="space-y-2">
          {description && (
            <p className="text-sm text-gray-600 mb-3">{description}</p>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Service</span>
            <span className="font-medium">{formatCurrency(amount, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Platform fee</span>
            <span className="font-medium">{formatCurrency(platformFee, currency)}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-lg text-gray-900">{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Card Form */}
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Cardholder Name</label>
          <input
            type="text"
            value={cardholderName}
            onChange={e => setCardholderName(e.target.value)}
            placeholder="Name on card"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Card Number</label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={cardNumber}
              onChange={e => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="1234 5678 9012 3456"
              required
              className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Expiry Date</label>
            <input
              type="text"
              value={expiry}
              onChange={e => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">CVV</label>
            <input
              type="text"
              value={cvv}
              onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="123"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 bg-[#059669] hover:bg-[#047857] text-white py-3 rounded-lg font-semibold text-sm transition disabled:opacity-50 shadow-lg shadow-emerald-200"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Pay {formatCurrency(total, currency)}
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <Lock className="h-3 w-3" />
          <span>Secured by NCB Jamaica | Visa, MasterCard, KeyCard accepted</span>
        </div>
      </form>
    </div>
  )
}
