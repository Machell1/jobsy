import React from 'react'
import ChatBubble from './ChatBubble'
import StreamingText from './StreamingText'
import CostBreakdownCard from './messages/CostBreakdownCard'
import BudgetWarningCard from './messages/BudgetWarningCard'
import MarketResearchCard from './messages/MarketResearchCard'
import JobPreviewCard from './messages/JobPreviewCard'
import type { ChatMessage, useAiChat } from './useAiChat'

type ChatApi = ReturnType<typeof useAiChat>

interface Props {
  chat: ChatApi
}

export default function MessageList({ chat }: Props) {
  return (
    <div className="space-y-5">
      {chat.messages.map((msg) => (
        <MessageRow key={msg.id} message={msg} chat={chat} />
      ))}
    </div>
  )
}

function MessageRow({ message, chat }: { message: ChatMessage; chat: ChatApi }) {
  if (message.role === 'user') {
    if (message.type === 'text') {
      return (
        <ChatBubble role="user">
          {message.content}
        </ChatBubble>
      )
    }
    return null
  }

  switch (message.type) {
    case 'text':
      return (
        <ChatBubble role="assistant">
          <StreamingText text={message.content} streaming={message.streaming} />
        </ChatBubble>
      )
    case 'rejected':
      return (
        <ChatBubble role="assistant" variant="rejected">
          {message.content}
          <div className="mt-3 text-xs text-red-700/80">
            Scope lock: only Jobsy job posts, pricing, and contracts.
          </div>
        </ChatBubble>
      )
    case 'cost_breakdown':
      return (
        <ChatBubble role="assistant">
          <CostBreakdownCard projection={message.payload} />
        </ChatBubble>
      )
    case 'budget_warning':
      return (
        <ChatBubble role="assistant">
          <BudgetWarningCard verdict={message.payload} />
        </ChatBubble>
      )
    case 'market_research':
      return (
        <ChatBubble role="assistant">
          <MarketResearchCard payload={message.payload} />
        </ChatBubble>
      )
    case 'job_preview':
      return (
        <ChatBubble role="assistant">
          <JobPreviewCard
            payload={message.payload}
            onConfirm={async () => {
              const result = await chat.finalizeSession()
              if (result?.job_post?.id) {
                window.location.hash = `#/job-board?new=${result.job_post.id}`
              }
            }}
          />
        </ChatBubble>
      )
    case 'tile_prompt':
      // Inline tile prompt - text + option chips
      return (
        <ChatBubble role="assistant">
          <div>{message.content}</div>
          {message.options.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => chat.sendStreamed(opt)}
                  className="px-3 py-1.5 rounded-full border border-emerald-300 hover:bg-emerald-50 text-sm text-emerald-800 transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </ChatBubble>
      )
    default:
      return null
  }
}
