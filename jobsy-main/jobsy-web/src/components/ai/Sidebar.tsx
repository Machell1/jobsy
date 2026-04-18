import React from 'react'
import { MessageSquare, Plus, Sparkles } from 'lucide-react'
import ThreadListItem from './ThreadListItem'

export interface ThreadListEntry {
  id: string
  title: string
  mode: string
  status: string
  created_job_post_id?: string | null
  updated_at?: string
}

interface SidebarProps {
  threads: ThreadListEntry[]
  loading: boolean
  activeId: string | null
  onNewChat: () => void
  onSelect: (threadId: string) => void
}

export default function Sidebar({ threads, loading, activeId, onNewChat, onSelect }: SidebarProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Branding header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 grid place-items-center shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Jobsy Assistant</div>
            <div className="text-[11px] text-gray-500 font-mono">DeepSeek V3</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-medium text-sm py-2.5 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {loading && threads.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-gray-500">Loading conversations…</div>
        ) : threads.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <div className="text-xs text-gray-500">No conversations yet</div>
            <div className="text-[11px] text-gray-400 mt-1">Start a new chat to get going</div>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {threads.map((t) => (
              <ThreadListItem
                key={t.id}
                thread={t}
                active={t.id === activeId}
                onClick={() => onSelect(t.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 text-[11px] text-gray-500">
        <div className="font-medium text-gray-700 mb-0.5">Scope locked</div>
        I only answer questions about Jobsy job posts, Jamaica pricing, and contracts.
      </div>
    </div>
  )
}
