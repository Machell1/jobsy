import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiGet } from '../../lib/api'
import Sidebar, { ThreadListEntry } from './Sidebar'
import MainArea from './MainArea'
import { useAiChat } from './useAiChat'
import { Menu } from 'lucide-react'

/**
 * Jobsy AI Assistant — Claude-style dashboard shell.
 *
 * Desktop: persistent 280px sidebar on the left + main chat area on the right.
 * Mobile (<md): sidebar collapses to an off-canvas drawer.
 */
export default function DashboardShell() {
  const { token } = useAuth()
  const chat = useAiChat()
  const [threads, setThreads] = useState<ThreadListEntry[]>([])
  const [threadsLoading, setThreadsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Load thread list on mount
  const loadThreads = async () => {
    if (!token) return
    setThreadsLoading(true)
    try {
      const res = (await apiGet('/api/ai/sessions', token)) as { sessions: ThreadListEntry[] }
      setThreads(res.sessions ?? [])
    } catch {
      // non-fatal — sidebar shows "No conversations yet"
      setThreads([])
    } finally {
      setThreadsLoading(false)
    }
  }

  useEffect(() => {
    loadThreads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Refresh threads after session creation or posting
  useEffect(() => {
    if (chat.session) {
      loadThreads()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.session?.id, chat.session?.status])

  const handleNewChat = () => {
    chat.reset()
    setSidebarOpen(false)
  }

  const handleSelectThread = async (threadId: string) => {
    await chat.loadSession(threadId)
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex">
      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
        />
      )}

      {/* Sidebar - drawer on mobile, persistent on desktop */}
      <aside
        className={`fixed md:sticky top-16 left-0 h-[calc(100vh-64px)] w-[280px] z-50 transform transition-transform duration-200 bg-white border-r border-gray-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar
          threads={threads}
          loading={threadsLoading}
          activeId={chat.session?.id ?? null}
          onNewChat={handleNewChat}
          onSelect={handleSelectThread}
        />
      </aside>

      {/* Main pane */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header strip with menu + chat title */}
        <div className="md:hidden sticky top-16 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md hover:bg-gray-100"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </button>
          <div className="text-sm font-semibold text-gray-900">Jobsy Assistant</div>
        </div>

        <MainArea chat={chat} onThreadsChanged={loadThreads} />
      </main>
    </div>
  )
}
