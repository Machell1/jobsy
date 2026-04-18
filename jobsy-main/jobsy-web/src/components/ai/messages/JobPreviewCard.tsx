import React, { useState } from 'react'
import { CheckCircle2, Edit3, MapPin, DollarSign, Tag } from 'lucide-react'
import type { JobPreviewPayload } from '../useAiChat'

interface Props {
  payload: JobPreviewPayload
  onConfirm: () => void | Promise<void>
  onEdit?: () => void
}

function formatJmd(n: number | null | undefined): string {
  if (!n || !Number.isFinite(n)) return '—'
  return `J$${Math.round(n).toLocaleString()}`
}

export default function JobPreviewCard({ payload, onConfirm, onEdit }: Props) {
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)

  const handleConfirm = async () => {
    if (posting) return
    setPosting(true)
    try {
      await onConfirm()
      setPosted(true)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
          Ready to post
        </div>
        <div className="text-[15px] font-semibold text-gray-900 mt-0.5">{payload.title}</div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {payload.description}
        </div>

        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Tag className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-medium text-gray-900">{payload.category}</span>
            {payload.subcategory && <span className="text-gray-500">/ {payload.subcategory}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-medium text-gray-900">{payload.parish}</span>
          </div>
          {(payload.budget_min || payload.budget_max) && (
            <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
              <DollarSign className="h-3.5 w-3.5 text-gray-400" />
              <span className="font-mono tabular-nums font-medium text-gray-900">
                {formatJmd(payload.budget_min)} – {formatJmd(payload.budget_max)}
              </span>
            </div>
          )}
        </div>

        {payload.required_skills && payload.required_skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {payload.required_skills.map((s, i) => (
              <span
                key={i}
                className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
        {!posted ? (
          <>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={posting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium text-sm py-2.5 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              {posting ? 'Posting…' : 'Post this job'}
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-sm px-3 py-2.5 transition-colors"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </button>
            )}
          </>
        ) : (
          <div className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-50 text-emerald-800 font-medium text-sm py-2.5">
            <CheckCircle2 className="h-4 w-4" />
            Posted to the job board
          </div>
        )}
      </div>
    </div>
  )
}
