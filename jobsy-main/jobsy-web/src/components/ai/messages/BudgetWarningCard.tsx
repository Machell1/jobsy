import React from 'react'
import { AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react'
import type { BudgetVerdict } from '../useAiChat'

function formatJmd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—'
  return `J$${Math.round(n).toLocaleString()}`
}

interface Props {
  verdict: BudgetVerdict
}

/**
 * Shown BEFORE cost projection runs, when the pre-flight budget validator
 * detects the user's budget is too_low or too_high. This is the token saver:
 * we don't spend DeepSeek tokens on a full analysis if the budget is
 * unrealistic.
 */
export default function BudgetWarningCard({ verdict }: Props) {
  const isTooLow = verdict.verdict === 'too_low'
  const isTooHigh = verdict.verdict === 'too_high'
  const Icon = isTooLow ? ArrowDown : isTooHigh ? ArrowUp : AlertTriangle
  const accent = isTooLow
    ? 'border-red-300 bg-red-50 text-red-900'
    : isTooHigh
    ? 'border-amber-300 bg-amber-50 text-amber-900'
    : 'border-gray-300 bg-gray-50 text-gray-900'

  const headline = isTooLow
    ? 'Your budget is below typical Jamaica pricing'
    : isTooHigh
    ? 'Your budget is above typical Jamaica pricing'
    : 'Budget out of expected range'

  return (
    <div className={`rounded-2xl border-l-4 ${accent} border border-opacity-50 p-4 md:p-5`}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-white/70 grid place-items-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold leading-tight">{headline}</div>
          <div className="mt-2 text-sm leading-relaxed">{verdict.explanation}</div>

          {verdict.recommended_min_jmd > 0 && verdict.recommended_max_jmd > 0 && (
            <div className="mt-3 rounded-lg bg-white/70 border border-current/20 px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
                Typical Jamaica range
              </div>
              <div className="font-mono tabular-nums text-lg font-bold">
                {formatJmd(verdict.recommended_min_jmd)} – {formatJmd(verdict.recommended_max_jmd)}
              </div>
            </div>
          )}

          {(verdict.low_jmd || verdict.mid_jmd || verdict.high_jmd) && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              {verdict.low_jmd !== undefined && verdict.low_jmd > 0 && (
                <div className="rounded-md bg-white/60 px-2 py-1.5 text-center">
                  <div className="opacity-70 uppercase font-semibold">Low</div>
                  <div className="font-mono tabular-nums font-bold">{formatJmd(verdict.low_jmd)}</div>
                </div>
              )}
              {verdict.mid_jmd !== undefined && verdict.mid_jmd > 0 && (
                <div className="rounded-md bg-white/60 px-2 py-1.5 text-center">
                  <div className="opacity-70 uppercase font-semibold">Mid</div>
                  <div className="font-mono tabular-nums font-bold">{formatJmd(verdict.mid_jmd)}</div>
                </div>
              )}
              {verdict.high_jmd !== undefined && verdict.high_jmd > 0 && (
                <div className="rounded-md bg-white/60 px-2 py-1.5 text-center">
                  <div className="opacity-70 uppercase font-semibold">High</div>
                  <div className="font-mono tabular-nums font-bold">{formatJmd(verdict.high_jmd)}</div>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 text-[11px] opacity-70">
            {verdict.used_llm ? 'Verified by AI market review' : 'Checked against Jobsy reference pricing'}
            {' — '}no LLM tokens spent on full analysis
          </div>
        </div>
      </div>
    </div>
  )
}
