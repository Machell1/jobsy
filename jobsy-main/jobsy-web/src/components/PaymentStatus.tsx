import { CheckCircle, Clock, XCircle, RotateCcw, Loader2, Download } from 'lucide-react'

interface PaymentStatusProps {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  amount: number
  platformFee?: number
  currency?: string
  description?: string
  transactionId?: string
  date?: string
  providerName?: string
}

function formatCurrency(amount: number, currency = 'JMD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

const statusMap = {
  pending: {
    icon: Clock,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    label: 'Payment Pending',
    description: 'Waiting for payment confirmation.',
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    label: 'Processing',
    description: 'Your payment is being processed.',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600 bg-green-50 border-green-200',
    label: 'Payment Successful',
    description: 'Your payment has been completed.',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600 bg-red-50 border-red-200',
    label: 'Payment Failed',
    description: 'Your payment could not be processed. Please try again.',
  },
  refunded: {
    icon: RotateCcw,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    label: 'Refunded',
    description: 'This payment has been refunded to your account.',
  },
}

export default function PaymentStatus({
  status,
  amount,
  platformFee = 0,
  currency = 'JMD',
  description,
  transactionId,
  date,
  providerName,
}: PaymentStatusProps) {
  const config = statusMap[status] || statusMap.pending
  const Icon = config.icon
  const total = amount + platformFee
  const netToProvider = amount - (amount * 0.05) // 5% platform fee from provider side

  return (
    <div className={`border rounded-xl overflow-hidden ${config.color}`}>
      {/* Status Header */}
      <div className="px-6 py-4 flex items-center gap-3">
        <div className="p-2 rounded-full bg-white/60">
          <Icon className={`h-6 w-6 ${status === 'processing' ? 'animate-spin' : ''}`} />
        </div>
        <div>
          <h3 className="font-semibold text-base">{config.label}</h3>
          <p className="text-sm opacity-80">{config.description}</p>
        </div>
      </div>

      {/* Receipt Details */}
      <div className="bg-white px-6 py-5 space-y-3">
        {description && (
          <p className="text-sm text-gray-600 pb-2 border-b border-gray-100">{description}</p>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Service amount</span>
            <span className="font-medium text-gray-900">{formatCurrency(amount, currency)}</span>
          </div>
          {platformFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Platform fee</span>
              <span className="font-medium text-gray-900">{formatCurrency(platformFee, currency)}</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="font-semibold text-gray-900">Total paid</span>
            <span className="font-bold text-lg text-gray-900">{formatCurrency(total, currency)}</span>
          </div>
        </div>

        {/* Meta info */}
        <div className="pt-3 border-t border-gray-100 space-y-1.5">
          {providerName && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Provider</span>
              <span className="font-medium text-gray-700">{providerName}</span>
            </div>
          )}
          {transactionId && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Transaction ID</span>
              <span className="font-mono text-gray-700">{transactionId.slice(0, 16)}...</span>
            </div>
          )}
          {date && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Date</span>
              <span className="text-gray-700">
                {new Date(date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>

        {/* NCB badge */}
        <div className="pt-3 flex items-center justify-center text-xs text-gray-400 gap-1">
          <span>Secured by NCB Jamaica</span>
        </div>
      </div>
    </div>
  )
}
