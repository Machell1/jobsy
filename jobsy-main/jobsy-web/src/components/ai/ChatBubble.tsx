import React from 'react'
import { Sparkles, AlertCircle } from 'lucide-react'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  variant?: 'default' | 'rejected'
  children: React.ReactNode
}

/**
 * Base chat bubble for user and assistant messages.
 *
 * Assistant: left-aligned, white background, emerald-gradient Sparkles avatar.
 * User: right-aligned, emerald-tinted background, no avatar (the user knows
 * they typed it).
 *
 * Typography: 15px/1.65 line height - deliberately roomier than default Tailwind
 * because chat reads better with more breathing room.
 */
export default function ChatBubble({ role, variant = 'default', children }: ChatBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[680px] rounded-2xl rounded-tr-sm bg-emerald-50 border border-emerald-100 px-4 py-3 text-[15px] leading-[1.65] text-gray-900 whitespace-pre-wrap">
          {children}
        </div>
      </div>
    )
  }

  const isRejected = variant === 'rejected'

  return (
    <div className="flex gap-3">
      <div
        className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 sticky top-4 self-start shadow-sm
          ${isRejected ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-emerald-500 to-emerald-700'}
        `}
      >
        {isRejected ? (
          <AlertCircle className="h-4 w-4 text-white" />
        ) : (
          <Sparkles className="h-4 w-4 text-white" />
        )}
      </div>
      <div className={`max-w-[720px] flex-1 min-w-0 text-[15px] leading-[1.65]
        ${isRejected ? 'text-red-900' : 'text-gray-900'}
      `}>
        {children}
      </div>
    </div>
  )
}
