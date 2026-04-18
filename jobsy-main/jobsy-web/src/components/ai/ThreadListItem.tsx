import React from 'react'
import type { ThreadListEntry } from './Sidebar'
import { CheckCircle2, Sparkles, ListChecks, Calculator, FileText } from 'lucide-react'

const MODE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  guided: ListChecks,
  auto: Sparkles,
  estimate: Calculator,
  contract_qa: FileText,
}

interface Props {
  thread: ThreadListEntry
  active: boolean
  onClick: () => void
}

export default function ThreadListItem({ thread, active, onClick }: Props) {
  const Icon = MODE_ICON[thread.mode] ?? ListChecks
  const posted = thread.status === 'posted'

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left flex items-start gap-2.5 rounded-md px-3 py-2 text-sm transition-colors
          ${active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-700 hover:bg-gray-100'}
        `}
      >
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${active ? 'text-emerald-600' : 'text-gray-400'}`} />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{thread.title || 'New chat'}</div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
            <span className="capitalize">{thread.mode.replace('_', ' ')}</span>
            {posted && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  posted
                </span>
              </>
            )}
          </div>
        </div>
      </button>
    </li>
  )
}
