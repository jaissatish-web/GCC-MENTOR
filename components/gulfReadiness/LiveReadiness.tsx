'use client'

import { useMemo } from 'react'
import { scoreProfileReadiness, type ProfileScoringInput } from '@/lib/gulfReadiness/fromProfile'
import type { FunnelAnswers } from '@/lib/gulfReadiness/types'

/**
 * The live Gulf Readiness score, recomputed as the Career Profile is built.
 *
 * Founder decision 2026-08-18: readiness updates instantly for both tiers as the
 * profile fills. It runs the SAME arithmetic engine as the anonymous scan (via
 * scoreProfileReadiness), so the number stays consistent with what the user saw
 * before signup and rises as they complete the profile — framed as improvement,
 * not a fixed grade.
 *
 * Pure and driven by props: give it the current profile fields and the funnel
 * answers, it shows a score. No network, no model, no side effects.
 */

export function LiveReadiness({
  profile,
  answers,
}: {
  profile: ProfileScoringInput
  answers: FunnelAnswers | null
}) {
  const result = useMemo(() => (answers ? scoreProfileReadiness(profile, answers) : null), [profile, answers])

  if (!result) {
    return (
      <div className="rounded-radius-lg border border-line-light bg-surface-2-light/50 px-4 py-3 text-[12px] text-ink-400">
        Answer the Gulf-experience questions to see your live readiness score.
      </div>
    )
  }

  const tone =
    result.band.key === 'ready' ? 'text-forest' : result.band.key === 'mid' ? 'text-gold-text' : 'text-terra'

  return (
    <div className="rounded-radius-lg border border-line-light bg-surface-light px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Gulf Readiness</span>
        <span className="rounded-full bg-surface-2-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">
          {result.scenarioLabel}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-ink-400">
        How ready you are for the Gulf job market — different from how complete your profile is.
      </p>
      <div className="mt-2 flex items-end gap-2">
        <span className={`font-mono text-3xl font-bold ${tone}`}>{result.finalScore}</span>
        <span className="pb-1 text-[11px] text-ink-400">/ 100 · {result.band.label}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2-light">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${result.band.key === 'ready' ? 'bg-forest' : result.band.key === 'mid' ? 'bg-redesign-gold' : 'bg-terra'}`}
          style={{ width: `${result.finalScore}%` }}
        />
      </div>
      <p className="mt-2.5 text-[12px] leading-snug text-ink-700">
        Your score improves as you complete your profile. {result.recommendations[0]?.title ? `Next: ${result.recommendations[0].title.toLowerCase()}.` : 'Add more detail to strengthen it.'}
      </p>
    </div>
  )
}
