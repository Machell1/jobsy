import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
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

export default function PaymentsPage() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('transactions')

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

  const transactions = transactionsData || []
  const payouts = payoutsData || []

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
                    return (
                      <div key={tx.id} className="px-6 py-4 flex items-center gap-4">
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
            <div className="py-16 text-center">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Payment Methods</h3>
              <p className="text-sm text-gray-500 mb-4">
                Add a payment method to make and receive payments
              </p>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition text-sm font-medium">
                <Plus className="h-4 w-4" />
                Add Payment Method
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
