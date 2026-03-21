import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiGet, ApiError } from '../lib/api'
import {
  MessageSquare,
  Plus,
  Loader2,
  Search,
  Inbox,
  ArrowLeft,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { StreamChat } from 'stream-chat'
import {
  Chat,
  ChannelList,
  Channel,
  Window,
  MessageList,
  MessageInput,
  Thread,
  ChannelHeader,
  ChannelPreviewMessenger,
} from 'stream-chat-react'
import type { ChannelPreviewUIComponentProps } from 'stream-chat-react'
import 'stream-chat-react/dist/css/v2/index.css'

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY || ''

interface ChatTokenResponse {
  token?: string
  stream_token?: string
  user_id?: string
}

export default function MessagesPage() {
  const { token, user } = useAuth()
  const { toast } = useToast()
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [chatClient, setChatClient] = useState<StreamChat | null>(null)
  const [selectedChannel, setSelectedChannel] = useState(false)

  // Fetch chat token
  const {
    data: chatToken,
    isLoading: tokenLoading,
    isError: tokenError,
  } = useQuery<ChatTokenResponse>({
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

  // Initialize Stream Chat client once we have a token
  const initChat = useCallback(async () => {
    if (!chatToken || !user) return

    const streamToken = chatToken.stream_token || chatToken.token
    if (!streamToken) return

    // Disconnect any existing client
    if (chatClient) {
      await chatClient.disconnectUser()
    }

    const client = StreamChat.getInstance(STREAM_API_KEY)

    try {
      await client.connectUser(
        {
          id: chatToken.user_id || user.id,
          name: user.display_name || `User ${user.id}`,
          image: undefined,
        },
        streamToken
      )
      setChatClient(client)
    } catch (err) {
      console.error('Stream Chat connection error:', err)
      toast({
        title: 'Chat connection failed',
        description: 'Unable to connect to chat. Please try again.',
        variant: 'destructive',
      })
    }
  }, [chatToken, user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initChat()

    return () => {
      if (chatClient) {
        chatClient.disconnectUser()
      }
    }
  }, [chatToken, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mobile: track if a channel is selected to toggle between list/thread
  const handleChannelSelect = () => {
    setSelectedChannel(true)
  }

  // Custom preview component that triggers mobile channel selection
  const CustomPreview = (props: ChannelPreviewUIComponentProps) => (
    <div onClick={handleChannelSelect}>
      <ChannelPreviewMessenger {...props} />
    </div>
  )

  const handleBack = () => {
    setSelectedChannel(false)
  }

  // Loading state
  if (tokenLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Error state
  if (tokenError) {
    return (
      <div className="space-y-6">
        <Header showNewConversation={showNewConversation} setShowNewConversation={setShowNewConversation} />
        <div className="text-center py-16">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Chat unavailable</h3>
          <p className="text-gray-500 text-sm">
            Unable to connect to the messaging service. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  // Chat client not ready yet
  if (!chatClient) {
    return (
      <div className="space-y-6">
        <Header showNewConversation={showNewConversation} setShowNewConversation={setShowNewConversation} />
        <EmptyState />
      </div>
    )
  }

  // Filters for channel list - show channels user is a member of
  const filters = { members: { $in: [chatToken?.user_id || user?.id || ''] }, type: 'messaging' }
  const sort = { last_message_at: -1 as const }

  return (
    <div className="space-y-4">
      <Header showNewConversation={showNewConversation} setShowNewConversation={setShowNewConversation} />

      {showNewConversation && <NewConversationInfo />}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <Chat client={chatClient} theme="str-chat__theme-light">
          <div className="flex h-[calc(100vh-220px)] min-h-[500px]">
            {/* Channel List - hidden on mobile when a channel is selected */}
            <div
              className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex-shrink-0 ${
                selectedChannel ? 'hidden md:block' : 'block'
              }`}
            >
              <ChannelList
                filters={filters}
                sort={sort}
                showChannelSearch
                EmptyStateIndicator={ChannelListEmpty}
                setActiveChannelOnMount={false}
                Preview={CustomPreview}
              />
            </div>

            {/* Message Thread - hidden on mobile when no channel is selected */}
            <div
              className={`flex-1 flex flex-col min-w-0 ${
                selectedChannel ? 'block' : 'hidden md:flex'
              }`}
            >
              <Channel>
                {/* Mobile back button */}
                <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                  <button
                    onClick={handleBack}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm text-gray-500">Back to conversations</span>
                </div>

                <Window>
                  <ChannelHeader />
                  <MessageList />
                  <MessageInput focus />
                </Window>
                <Thread />
              </Channel>
            </div>
          </div>
        </Chat>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function Header({
  showNewConversation,
  setShowNewConversation,
}: {
  showNewConversation: boolean
  setShowNewConversation: (v: boolean) => void
}) {
  return (
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
  )
}

function NewConversationInfo() {
  return (
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
  )
}

function ChannelListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <Inbox className="h-10 w-10 text-gray-300 mb-3" />
      <h3 className="text-sm font-medium text-gray-900 mb-1">No conversations yet</h3>
      <p className="text-xs text-gray-500">
        Start a conversation from a provider's profile page.
      </p>
    </div>
  )
}

function EmptyState() {
  return (
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
  )
}
