import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPut } from '../lib/api'
import {
  Bell,
  BellOff,
  CheckCheck,
  Loader2,
  Info,
  Calendar,
  MessageSquare,
  Star,
  CreditCard,
} from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  timestamp: string
  read: boolean
  type?: string
}

function getNotificationIcon(type?: string) {
  switch (type) {
    case 'booking':
      return Calendar
    case 'message':
      return MessageSquare
    case 'review':
      return Star
    case 'payment':
      return CreditCard
    default:
      return Info
  }
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  } catch {
    return ts
  }
}

export default function NotificationsPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery<Notification[] | { items: Notification[] }>({
    queryKey: ['notifications'],
    queryFn: () => apiGet('/api/notifications/', token),
    enabled: !!token,
  })

  const notifications: Notification[] = Array.isArray(data) ? data : (data as { items: Notification[] })?.items || []

  const markAllReadMutation = useMutation({
    mutationFn: () => apiPut('/api/notifications/read-all', {}, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast({ title: 'All notifications marked as read' })
    },
    onError: () => {
      toast({ title: 'Failed to mark as read', variant: 'destructive' })
    },
  })

  const unreadCount = notifications.filter(n => !n.read).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition disabled:opacity-50"
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Mark All Read
          </button>
        )}
      </div>

      {/* Notifications List */}
      {isError ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Unable to load notifications</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <BellOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
          <p className="text-sm text-gray-500">
            You're all caught up! We'll notify you when something happens.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          {notifications.map(notif => {
            const Icon = getNotificationIcon(notif.type)
            return (
              <div
                key={notif.id}
                className={`px-6 py-4 flex items-start gap-4 transition ${
                  !notif.read ? 'bg-primary/[0.02]' : ''
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  !notif.read ? 'bg-primary/10' : 'bg-gray-100'
                }`}>
                  <Icon className={`h-5 w-5 ${!notif.read ? 'text-primary' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!notif.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {notif.title}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                      {formatTimestamp(notif.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                </div>
                {!notif.read && (
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
