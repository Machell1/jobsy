import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiGet, apiPost, apiDelete, ApiError } from '../lib/api'
import {
  Calendar,
  ArrowLeft,
  Loader2,
  Users,
  Ticket,
  DollarSign,
  Megaphone,
  Send,
  XCircle,
  BarChart3,
  Eye,
  AlertCircle,
} from 'lucide-react'

interface DashboardData {
  event: {
    id: string
    title: string
    status: string
    start_date: string
    is_free: boolean
    rsvp_count: number
    ticket_sold_count: number
    view_count: number
    capacity: number | null
    currency: string
  }
  rsvps: Array<{
    id: string
    user_id: string
    status: string
    created_at: string
  }>
  rsvp_count: number
  tickets: Array<{
    id: string
    user_id: string
    quantity: number
    total_amount: number
    status: string
    created_at: string
  }>
  ticket_sales_count: number
  total_revenue: number
  currency: string
}

export default function EventDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [updateContent, setUpdateContent] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'attendees' | 'tickets'>('overview')

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['event-dashboard', id],
    queryFn: () => apiGet(`/api/events/${id}/dashboard`, token),
    enabled: !!id && !!token,
  })

  // Post update mutation
  const postUpdateMutation = useMutation({
    mutationFn: (content: string) => apiPost(`/api/events/${id}/updates`, { content }, token),
    onSuccess: () => {
      toast({ title: 'Update posted!' })
      setUpdateContent('')
      queryClient.invalidateQueries({ queryKey: ['event-dashboard', id] })
      queryClient.invalidateQueries({ queryKey: ['event-updates', id] })
    },
    onError: (err: ApiError) => toast({ title: err.detail || 'Failed to post update', variant: 'destructive' }),
  })

  // Cancel event mutation
  const cancelMutation = useMutation({
    mutationFn: () => apiDelete(`/api/events/${id}`, token),
    onSuccess: () => {
      toast({ title: 'Event cancelled' })
      navigate('/events')
    },
    onError: (err: ApiError) => toast({ title: err.detail || 'Failed to cancel event', variant: 'destructive' }),
  })

  const handlePostUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!updateContent.trim()) return
    postUpdateMutation.mutate(updateContent.trim())
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-JM', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-medium text-gray-700">Dashboard not available</h2>
        <Link to="/events" className="text-primary text-sm mt-2 inline-block hover:underline">Back to events</Link>
      </div>
    )
  }

  const { event, rsvps, tickets, rsvp_count, ticket_sales_count, total_revenue, currency } = data

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/events/${id}`)} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary shrink-0" />
            Event Dashboard
          </h1>
          <p className="text-sm text-gray-500 truncate">{event.title}</p>
        </div>
        {event.status === 'active' && (
          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
        )}
        {event.status === 'cancelled' && (
          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Cancelled</span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <Users className="h-6 w-6 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{rsvp_count}</p>
          <p className="text-xs text-gray-500">RSVPs</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <Ticket className="h-6 w-6 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{ticket_sales_count}</p>
          <p className="text-xs text-gray-500">Tickets Sold</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <DollarSign className="h-6 w-6 text-gold mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">${total_revenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Revenue ({currency})</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <Eye className="h-6 w-6 text-purple-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{event.view_count || 0}</p>
          <p className="text-xs text-gray-500">Views</p>
        </div>
      </div>

      {/* Post Update */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Post Update to Attendees
        </h2>
        <form onSubmit={handlePostUpdate} className="space-y-3">
          <textarea
            value={updateContent}
            onChange={e => setUpdateContent(e.target.value)}
            placeholder="Share an update about your event (e.g. schedule change, reminder, etc.)"
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <button
            type="submit"
            disabled={postUpdateMutation.isPending || !updateContent.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition disabled:opacity-50"
          >
            {postUpdateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post Update
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'overview' as const, label: 'Overview' },
          { key: 'attendees' as const, label: `RSVPs (${rsvp_count})` },
          { key: 'tickets' as const, label: `Tickets (${ticket_sales_count})` },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Event Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Date:</span>
                <p className="font-medium">{formatDate(event.start_date)}</p>
              </div>
              <div>
                <span className="text-gray-500">Type:</span>
                <p className="font-medium">{event.is_free ? 'Free' : 'Paid'}</p>
              </div>
              <div>
                <span className="text-gray-500">Capacity:</span>
                <p className="font-medium">{event.capacity || 'Unlimited'}</p>
              </div>
              <div>
                <span className="text-gray-500">Total Attendees:</span>
                <p className="font-medium">{rsvp_count + ticket_sales_count}</p>
              </div>
            </div>
          </div>

          {/* Cancel Event */}
          {event.status === 'active' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Danger Zone
              </h3>
              <p className="text-sm text-red-600 mb-3">Cancelling will notify all attendees. This action cannot be undone.</p>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel this event? All attendees will be notified.')) {
                    cancelMutation.mutate()
                  }
                }}
                disabled={cancelMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Cancel Event
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'attendees' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {rsvps.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No RSVPs yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rsvps.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-gray-900">{r.user_id.slice(0, 12)}...</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {tickets.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No tickets sold yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-gray-900">{t.user_id.slice(0, 12)}...</td>
                    <td className="px-4 py-3 text-gray-700">{t.quantity}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">${t.total_amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
