import React from 'react'
import { ExternalLink, TrendingUp, Sparkles } from 'lucide-react'
import type { CostProjection, CostTier } from '../useAiChat'

function formatJmd(n: number): string {
  if (!Number.isFinite(n)) return 'J$0'
  return `J$${Math.round(n).toLocaleString()}`
}

function Tier({
  label,
  tier,
  highlight,
  description,
}: {
  label: string
  tier: CostTier
  highlight: boolean
  description: string
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors
        ${highlight ? 'border-amber-300 bg-amber-50/50 ring-2 ring-amber-200' : 'border-gray-200 bg-white'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
        {highlight && (
          <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 uppercase">
            <Sparkles className="h-3 w-3" />
            Recommended
          </div>
        )}
      </div>
      <div className="text-xl font-bold font-mono tabular-nums text-gray-900">
        {formatJmd(tier.total_jmd)}
      </div>
      <div className="text-[11px] text-gray-500 mb-3">{description}</div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between text-gray-600">
          <span>Materials</span>
          <span className="font-mono tabular-nums">{formatJmd(tier.materials_jmd)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Labour</span>
          <span className="font-mono tabular-nums">{formatJmd(tier.labor_jmd)}</span>
        </div>
      </div>

      {tier.materials_breakdown.length > 0 && (
        <details className="mt-3 group">
          <summary className="text-[11px] text-gray-500 hover:text-gray-700 cursor-pointer select-none list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform">▸</span>
            Materials breakdown
          </summary>
          <ul className="mt-2 space-y-1 text-[11px] text-gray-600">
            {tier.materials_breakdown.map((row, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate">{row.item}</span>
                <span className="font-mono tabular-nums shrink-0">{formatJmd(row.jmd)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {tier.labor_description && (
        <div className="mt-2 text-[11px] text-gray-500 italic leading-snug">
          {tier.labor_description}
        </div>
      )}
    </div>
  )
}

interface Props {
  projection: CostProjection
}

export default function CostBreakdownCard({ projection }: Props) {
  const { low, mid, high, recommended, assumptions, citations, used_web_search, used_reference } = projection

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-emerald-700" />
        <h3 className="text-sm font-semibold text-gray-900">Jamaica market cost projection</h3>
      </div>

      {/* Recommendation banner */}
      <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-sm text-emerald-900">
        <span className="font-semibold">Recommended budget: </span>
        <span className="font-mono tabular-nums">{formatJmd(recommended.total_jmd)}</span>
        <span className="ml-1 text-emerald-700">({recommended.tier} tier)</span>
        {recommended.reasoning && (
          <div className="text-[12px] text-emerald-800/90 mt-1 leading-snug">{recommended.reasoning}</div>
        )}
      </div>

      {/* 3-tier grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Tier
          label="Low quality"
          tier={low}
          highlight={recommended.tier === 'low'}
          description="Hardware-store materials + min-wage labour"
        />
        <Tier
          label="Mid quality"
          tier={mid}
          highlight={recommended.tier === 'mid'}
          description="Mid-brand materials + skilled tradesperson"
        />
        <Tier
          label="High quality"
          tier={high}
          highlight={recommended.tier === 'high'}
          description="Premium materials + licensed specialist"
        />
      </div>

      {/* Assumptions */}
      {assumptions.length > 0 && (
        <details className="mt-4 group">
          <summary className="text-[12px] text-gray-500 cursor-pointer hover:text-gray-700 list-none flex items-center gap-1 select-none">
            <span className="group-open:rotate-90 transition-transform">▸</span>
            Assumptions ({assumptions.length})
          </summary>
          <ul className="mt-2 space-y-1 text-[12px] text-gray-600 leading-relaxed">
            {assumptions.map((a, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-gray-400">·</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Citations */}
      {citations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Sources</div>
          <ul className="space-y-1.5">
            {citations.map((c, i) => (
              <li key={i} className="text-[12px]">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  {new URL(c.url).hostname}
                  <ExternalLink className="h-3 w-3" />
                </a>
                {c.used_for && <span className="text-gray-500"> — {c.used_for}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Provenance footer */}
      <div className="mt-3 text-[10px] text-gray-400 flex gap-3">
        {used_reference && <span>· Jobsy reference pricing</span>}
        {used_web_search && <span>· Tavily web research</span>}
      </div>
    </div>
  )
}
