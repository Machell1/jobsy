import React, { useState } from 'react'
import { Check } from 'lucide-react'

interface Props {
  question: string
  options: string[]
  onConfirm: (selected: string[]) => void
  minSelections?: number
  maxSelections?: number
}

/**
 * Multi-select tile grid. Used for e.g. "which skills do you need?" where
 * multiple tiles can be toggled before confirming.
 */
export default function TileGridMessage({
  question,
  options,
  onConfirm,
  minSelections = 0,
  maxSelections,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (opt: string) => {
    const next = new Set(selected)
    if (next.has(opt)) {
      next.delete(opt)
    } else {
      if (maxSelections && next.size >= maxSelections) return
      next.add(opt)
    }
    setSelected(next)
  }

  const canConfirm = selected.size >= minSelections

  return (
    <div>
      <div className="text-[15px] leading-[1.65] text-gray-900 mb-3">{question}</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {options.map((opt) => {
          const isSelected = selected.has(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 text-left
                ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300'
                }
              `}
            >
              <div
                className={`h-4 w-4 rounded border shrink-0 grid place-items-center
                  ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}
                `}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className="truncate">{opt}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        disabled={!canConfirm}
        onClick={() => onConfirm(Array.from(selected))}
        className="mt-3 inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium text-sm px-4 py-2 transition-colors"
      >
        Confirm ({selected.size}{maxSelections ? ` / ${maxSelections}` : ''})
      </button>
    </div>
  )
}
