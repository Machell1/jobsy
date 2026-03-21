import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiGet, apiPost, apiPut, ApiError } from '../lib/api'
import {
  Calendar,
  Plus,
  X,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  RefreshCw,
  Loader2,
  FileText,
  MapPin,
  User,
} from 'lucide-react'

type BookingStatus = 'all' | 'active' | 'completed' | 'cancelled'

interface Booking {
  id: string
  provider_id: string
  provider_name?: string
  service_type: string
  scheduled_date: string
  scheduled_time?: string
  status: string
  notes?: string
  address?: string
  created_at?: string
}

interface BookingStats {
  total: number
  active: number
  completed: number
  cancelled: number
}

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pending' },
  confirmed: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle, label: 'Confirmed' },
  active: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Active' },
  in_progress: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: RefreshCw, label: 'In Progress' },
  completed: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: CheckCircle, label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Cancelled' },
}

function getStatusInfo(status: string) {
  return statusConfig[status] || statusConfig.pending
}

export default function BookingsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const providerIdFromUrl = searchParams.get('provider_id')

  const [activeTab, setActiveTab] = useState<BookingStatus>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    provider_id: '',
    service_type: '',
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
    address: '',
  })

  // Auto-open create modal if provider_id is in URL
  useEffect(() => {
    if (providerIdFromUrl) {
      setFormData(prev => ({ ...prev, provider_id: providerIdFromUrl }))
      setShowCreateModal(true)
    }
  }, [providerIdFromUrl])

  // Fetch bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: () => apiGet('/api/bookings', token),
    enabled: !!token,
  })

  // Fetch stats
  const { data: stats } = useQuery<BookingStats>({
    queryKey: ['bookings', 'stats'],
    queryFn: () => apiGet('/api/bookings/stats', token),
    enabled: !!token,
  })

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      apiPost('/api/bookings/', data, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast({ title: 'Booking created successfully' })
      setShowCreateModal(false)
      resetForm()
    },
    onError: (err: Error) => {
      const detail = err instanceof ApiError ? err.detail : err.message
      toast({ title: 'Failed to create booking', description: detail, variant: 'destructive' })
    },
  })

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: string) =>
      apiPut(`/api/bookings/${bookingId}/status`, { status: 'cancelled' }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast({ title: 'Booking cancelled' })
    },
    onError: (err: Error) => {
      const detail = err instanceof ApiError ? err.detail : err.message
      toast({ title: 'Failed to cancel booking', description: detail, variant: 'destructive' })
    },
  })

  // Reschedule booking mutation
  const rescheduleBookingMutation = useMutation({
    mutationFn: ({ bookingId, date, time }: { bookingId: string; date: string; time: string }) =>
      apiPut(`/api/bookings/${bookingId}`, { scheduled_date: date, scheduled_time: time }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast({ title: 'Booking rescheduled' })
      setShowRescheduleModal(null)
      setRescheduleDate('')
      setRescheduleTime('')
    },
    onError: (err: Error) => {
      const detail = err instanceof ApiError ? err.detail : err.message
      toast({ title: 'Failed to reschedule', description: detail, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormData({
      provider_id: providerIdFromUrl || '',
      service_type: '',
      scheduled_date: '',
      scheduled_time: '',
      notes: '',
      address: '',
    })
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.provider_id || !formData.service_type || !formData.scheduled_date) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' })
      return
    }
    createBookingMutation.mutate(formData)
  }

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!showRescheduleModal || !rescheduleDate) return
    rescheduleBookingMutation.mutate({
      bookingId: showRescheduleModal,
      date: rescheduleDate,
      time: rescheduleTime,
    })
  }

  // Filter bookings by tab
  const filteredBookings = bookings.filter((b: Booking) => {
    if (activeTab === 'all') return true
    if (activeTab === 'active') return ['pending', 'confirmed', 'active', 'in_progress'].includes(b.status)
    return b.status === activeTab
  })

  const tabs: { key: BookingStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  const displayStats: BookingStats = stats || {
    total: bookings.length,
    active: bookings.filter((b: Booking) => ['pending', 'confirmed', 'active', 'in_progress'].includes(b.status)).length,
    completed: bookings.filter((b: Booking) => b.status === 'completed').length,
    cancelled: bookings.filter((b: Booking) => b.status === 'cancelled').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-7 w-7 text-primary" />
            Bookings
          </h1>
          <p className="text-gray-600 text-sm mt-1">Manage your service bookings</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-primary hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition"
        >
          <Plus className="h-4 w-4" />
          Create Booking
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{displayStats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{displayStats.active}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100">
              <CheckCircle className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{displayStats.completed}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{displayStats.cancelled}</p>
              <p className="text-xs text-gray-500">Cancelled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {bookingsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No bookings found</h3>
          <p className="text-gray-500 text-sm">
            {activeTab === 'all'
              ? 'Create your first booking to get started.'
              : `No ${activeTab} bookings.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking: Booking) => {
            const statusInfo = getStatusInfo(booking.status)
            const StatusIcon = statusInfo.icon
            const isActionable = ['pending', 'confirmed', 'active', 'in_progress'].includes(booking.status)

            return (
              <div
                key={booking.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Booking info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900 truncate">
                        {booking.provider_name || `Provider ${booking.provider_id}`}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                      {booking.service_type}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {booking.scheduled_date}
                      </span>
                      {booking.scheduled_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {booking.scheduled_time}
                        </span>
                      )}
                      {booking.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {booking.address}
                        </span>
                      )}
                    </div>
                    {booking.notes && (
                      <p className="text-xs text-gray-400 mt-1 truncate">Note: {booking.notes}</p>
                    )}
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </span>
                    {isActionable && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setShowRescheduleModal(booking.id)
                            setRescheduleDate(booking.scheduled_date)
                            setRescheduleTime(booking.scheduled_time || '')
                          }}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                          title="Reschedule"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => cancelBookingMutation.mutate(booking.id)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                          title="Cancel"
                          disabled={cancelBookingMutation.isPending}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Booking Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create Booking</h2>
              <button
                onClick={() => { setShowCreateModal(false); resetForm() }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.provider_id}
                  onChange={e => setFormData(prev => ({ ...prev, provider_id: e.target.value }))}
                  placeholder="Enter provider ID"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                />
                {providerIdFromUrl && (
                  <p className="text-xs text-green-600 mt-1">Pre-filled from provider profile</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.service_type}
                  onChange={e => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
                  placeholder="e.g. Plumbing, Cleaning, Electrical"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={e => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={e => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Service address"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional details..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm() }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBookingMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {createBookingMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Reschedule Booking</h2>
              <button
                onClick={() => { setShowRescheduleModal(null); setRescheduleDate(''); setRescheduleTime('') }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleRescheduleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Time</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={e => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowRescheduleModal(null); setRescheduleDate(''); setRescheduleTime('') }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleBookingMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {rescheduleBookingMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
