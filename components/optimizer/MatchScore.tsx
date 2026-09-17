'use client'

import { cn } from '@/lib/utils'
import type { KeywordEvidence, MatchScore } from '@/lib/optimizer/types'
import { PART_LABELS, scoreBand } from '@/lib/optimizer/view'

/**
 * Match score display (2026-09-17, docs/17_OPTIMIZER_ENGINE.md §5).
 *
 * Every number here comes from lib/optimizer/score.ts — deterministic, never a
 * model's opinion — and the copy says what it is: a match against THIS job's
 * requirements, not a hiring probability.
 */

const TONE = {
  low: { ring: 'stroke-alert', text: 'text-alert', soft: 'bg-alert-soft' },
  mid: { ring: 'stroke-gold', text: 'text-gold-ink', soft: 'bg-gold-soft' },
  high: { ring: 'stroke-teal', text: 'text-teal', soft: 'bg-teal-soft' },
} as const

export function ScoreRing({
  value,
  size = 112,
  label,
  muted = false,
}: {
  value: number
  size?: number
  label?: string
  muted?: boolean
}) {
  const r = (size - 12) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, value))
  const tone = TONE[scoreBand(clamped).tone]
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={10} className="stroke-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * c} ${c}`}
          className={cn(muted ? 'stroke-line-strong' : tone.ring, 'transition-[stroke-dasharray] duration-700')}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-display leading-none', size >= 100 ? 'text-[32px]' : 'text-[22px]', muted ? 'text-ink-muted' : 'text-ink')}>
          {clamped}
        </span>
        {label ? <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</span> : null}
      </div>
    </div>
  )
}

export function BandPill({ value }: { value: number }) {
  const band = scoreBand(value)
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', TONE[band.tone].soft, TONE[band.tone].text)}>
      {band.label}
    </span>
  )
}

export function PartBars({ score, compare }: { score: MatchScore; compare?: MatchScore }) {
  const keys = (Object.keys(PART_LABELS) as Array<keyof MatchScore['parts']>).filter((k) => {
    const p = score.parts[k]
    return p !== null && p.weight > 0
  })
  return (
    <div className="flex flex-col gap-2.5">
      {keys.map((k) => {
        const part = score.parts[k]!
        const prev = compare?.parts[k]?.score
        const delta = prev === undefined ? 0 : part.score - prev
        return (
          <div key={k} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="font-semibold text-ink-soft">{PART_LABELS[k]}</span>
              <span className="font-mono text-ink">
                {part.score}
                {delta > 0 ? <span className="ml-1.5 text-teal">+{delta}</span> : null}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              {prev !== undefined && delta > 0 ? (
                <div className="relative h-full">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-teal/35" style={{ width: `${part.score}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-teal" style={{ width: `${prev}%` }} />
                </div>
              ) : (
                <div className="h-full rounded-full bg-teal" style={{ width: `${part.score}%` }} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function KeywordChips({
  items,
  tone,
}: {
  items: Array<{ term: string; hint?: string }>
  tone: 'matched' | 'supported' | 'gap'
}) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((k) => (
        <span
          key={k.term}
          title={k.hint}
          className={cn(
            'rounded-full border px-2.5 py-1 text-[12px] font-medium',
            tone === 'matched' && 'border-teal/40 bg-teal-soft text-teal',
            tone === 'supported' && 'border-gold/50 bg-gold-soft text-ink',
            tone === 'gap' && 'border-line bg-canvas text-ink-muted',
          )}
        >
          {tone === 'matched' ? '✓ ' : tone === 'supported' ? '↑ ' : ''}
          {k.term}
        </span>
      ))}
    </div>
  )
}

/** Group analysis keywords the way the screens explain them. */
export function groupKeywords(keywords: readonly KeywordEvidence[]) {
  const rank = (k: KeywordEvidence) => (k.importance === 'must' ? 0 : 1)
  const sorted = keywords.slice().sort((a, b) => rank(a) - rank(b))
  return {
    matched: sorted.filter((k) => k.status === 'matched'),
    /** In the profile, not yet said where it counts: optimization can place these. */
    improvable: sorted.filter((k) => k.status === 'listed' || k.status === 'supported'),
    // Soft skills are never written onto a CV by this product, so listing them as
    // "missing" would only tell the user to add adjectives to their profile.
    gaps: sorted.filter((k) => k.status === 'gap' && k.kind !== 'soft_skill'),
  }
}
