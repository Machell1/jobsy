import React from 'react'
import { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  subtitle: string
  accent?: 'emerald' | 'gold'
  onClick: () => void
  disabled?: boolean
}

/**
 * Welcome-state action tile. Also reused by TilePromptMessage for inline
 * answer chips when the AI asks a tile-prompt question.
 */
export default function ActionTile({ icon: Icon, title, subtitle, accent = 'emerald', onClick, disabled }: Props) {
  const accentBorder =
    accent === 'gold'
      ? 'border-amber-200 hover:border-amber-400'
      : 'border-emerald-200 hover:border-emerald-500'
  const accentIcon =
    accent === 'gold'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-emerald-100 text-emerald-700'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group w-full text-left rounded-xl border ${accentBorder} bg-white p-4 md:p-5 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg ${accentIcon} grid place-items-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-gray-900 leading-snug">{title}</div>
          <div className="text-sm text-gray-600 mt-1 leading-relaxed">{subtitle}</div>
        </div>
      </div>
    </button>
  )
}
