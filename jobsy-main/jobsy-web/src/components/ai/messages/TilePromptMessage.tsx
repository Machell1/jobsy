import React from 'react'

interface Props {
  question: string
  options: string[]
  onSelect: (option: string) => void
  disabled?: boolean
}

/**
 * Single-select tile prompt. The AI asks a question ("Which parish?") and
 * the user picks one of the offered tile options. Clicking a tile sends it
 * as a user turn, which advances the slot-filling conversation.
 */
export default function TilePromptMessage({ question, options, onSelect, disabled }: Props) {
  return (
    <div>
      <div className="text-[15px] leading-[1.65] text-gray-900 mb-3">{question}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt)}
            className="px-3.5 py-2 rounded-full border border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 text-sm text-emerald-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
