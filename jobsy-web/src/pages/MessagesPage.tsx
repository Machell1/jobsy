import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiGet, ApiError } from '../lib/api'
import {
  MessageSquare,
  Plus,
  Loader2,
  User,
  Clock,
  Search,
  Inbox,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

interface ChatToken {
  token?: string
  stream_token?: string
}

interface Conversation {
  id: string
  participant_id?: string
  participant_name?: string
  last_message?: string
  last_message_at?: string
  unread_count?: number
}

export default function MessagesPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [showNewConversation, setShowNewConversation] = useState(false)

  // Fetch chat token
  const { data: chatToken, isLoading: tokenLoading, isError: tokenError } = useQuery<ChatToken>({
    queryKey: ['chat', 'token'],
    queryFn: async () => {
      try {
        return await apiGet('/api/chat/token', token)
      } catch (err) {
        if (err instanceof ApiError) {
          toast({
            title: 'Chat unavailable',
            description: err.detail,
            variant: 'destructive',
          })
        }
        throw err
      }
    },
    enabled: !!token,
    retry: 1,
  })

  // Fetch conversations (only if we have a chat token)
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['chat', 'conversations'],
    queryFn: async () => {
      try {
        return await apiGet('/api/chat/conversations', token)
      } catch {
        // Conversations endpoint may not exist yet; return empty
        return []
      }
    },
    enabled: !!token && !!chatToken,
    retry: false,
  })

  const formatTimestamp = (ts?: string) => {
    if (!ts) return ''
    try {
      const date = new Date(ts)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      const diffDays = Math.floor(diffHours / 24)
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString()
    } catch {
      return ''
    }
  }

  const isLoading = tokenLoading || conversationsLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />
            Messages
          </h1>
          <p className="text-gray-600 text-sm mt-1">Your conversations</p>
        </div>
        <button
          onClick={() => setShowNewConversation(!showNewConversation)}
          className="inline-flex items-center gap-2 bg-primary hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </button>
      </div>

      {/* New Conversation Info */}
      {showNewConversation && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 shrink-0">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">Start a New Conversation</h3>
              <p className="text-sm text-blue-700">
                To start a conversation with a service provider, visit their profile page and click the
                "Message" button. You can find providers by{' '}
                <Link to="/search" className="underline font-medium hover:text-blue-900 transition">
                  searching for services
                </Link>{' '}
                or browsing the{' '}
                <Link to="/discover" className="underline font-medium hover:text-blue-900 transition">
                  Discover page
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tokenError ? (
        <div className="text-center py-16">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Chat unavailable</h3>
          <p className="text-gray-500 text-sm">
            Unable to connect to the messaging service. Please try again later.
          </p>
        </div>
      ) : conversations.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Inbox className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Start a conversation by visiting a provider's profile and clicking Message.
            You can find providers by searching or browsing the Discover page.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 bg-primary hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
            >
              <Search className="h-4 w-4" />
              Search Providers
            </Link>
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-lg text-sm font-medium transition"
            >
              Browse Discover
            </Link>
          </div>
        </div>
      ) : (
        /* Conversations list */
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {conversations.map((convo: Conversation) => (
            <div
              key={convo.id}
              className="flex items-center gap-3 p-4 hover:bg-gray-50 transition cursor-pointer"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {convo.participant_name || `User ${convo.participant_id || convo.id}`}
                  </p>
                  <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(convo.last_message_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {convo.last_message || 'No messages yet'}
                </p>
              </div>

              {/* Unread badge */}
              {convo.unread_count && convo.unread_count > 0 && (
                <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium shrink-0">
                  {convo.unread_count > 9 ? '9+' : convo.unread_count}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
