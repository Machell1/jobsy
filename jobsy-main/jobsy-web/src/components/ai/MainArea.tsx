import React, { useEffect, useRef } from 'react'
import WelcomeState from './WelcomeState'
import MessageList from './MessageList'
import Composer from './Composer'
import TypingIndicator from './TypingIndicator'
import { AlertCircle } from 'lucide-react'
import type { useAiChat } from './useAiChat'

type ChatApi = ReturnType<typeof useAiChat>

interface Props {
  chat: ChatApi
  onThreadsChanged: () => void
}

export default function MainArea({ chat, onThreadsChanged }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new message or streaming delta
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.messages, chat.streaming])

  const hasActiveSession = Boolean(chat.session)

  const handleSubmit = async (content: string) => {
    if (!content.trim()) return
    if (!chat.session) {
      // Auto-create a guided session if the user types before choosing a tile
      const session = await chat.createSession('guided')
      if (!session) return
      onThreadsChanged()
    }
    await chat.sendStreamed(content)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        data-testid="chat-scroll"
      >
        <div className="max-w-[820px] mx-auto w-full px-4 md:px-6 py-8">
          {!hasActiveSession && (
            <WelcomeState chat={chat} onThreadsChanged={onThreadsChanged} />
          )}

          {hasActiveSession && (
            <>
              <MessageList chat={chat} />
              {chat.streaming && chat.messages.length > 0 && (
                <div className="pl-12 mt-2">
                  <TypingIndicator />
                </div>
              )}

              {chat.error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Something went wrong</div>
                    <div className="text-red-700">{chat.error}</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Composer - always visible when in a session */}
      {hasActiveSession && (
        <div className="border-t border-gray-200 bg-white sticky bottom-0">
          <div className="max-w-[820px] mx-auto w-full px-4 md:px-6 py-4">
            <Composer
              disabled={chat.streaming}
              placeholder="Ask about pricing, a contract, or describe your job…"
              onSubmit={handleSubmit}
            />
            <div className="mt-2 text-[11px] text-gray-500 text-center">
              Answers are scoped to Jobsy job posts, Jamaica pricing, and contracts. AI can make mistakes — verify important details.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
