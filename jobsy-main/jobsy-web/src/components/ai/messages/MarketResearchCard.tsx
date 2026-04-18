import React from 'react'
import { Globe, ExternalLink } from 'lucide-react'
import type { MarketResearchPayload } from '../useAiChat'

interface Props {
  payload: MarketResearchPayload
}

export default function MarketResearchCard({ payload }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-4 w-4 text-gray-500" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Jamaica market research
        </h3>
      </div>
      {payload.answer && (
        <div className="text-sm text-gray-700 leading-relaxed mb-3 italic">
          “{payload.answer}”
        </div>
      )}
      <ul className="space-y-2">
        {payload.results.map((r, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <div className="h-5 w-5 rounded bg-white border border-gray-200 grid place-items-center shrink-0 text-[10px] font-semibold text-gray-500">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:text-emerald-900 font-medium inline-flex items-center gap-1 truncate"
              >
                {r.title || r.domain}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
              <div className="text-[11px] text-gray-400 font-mono truncate">{r.domain}</div>
              {r.snippet && (
                <div className="text-[12px] text-gray-600 leading-snug mt-1 line-clamp-2">
                  {r.snippet}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
