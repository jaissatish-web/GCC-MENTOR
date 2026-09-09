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
      <div className="rounded-card border border-line bg-canvas/50 px-4 py-3 text-[12px] text-ink-muted">
        Answer the Gulf-experience questions to see your live readiness score.
      </div>
    )
  }

  const tone =
    result.band.key === 'ready' ? 'text-teal' : result.band.key === 'mid' ? 'text-teal' : 'text-alert'

  return (
    <div className="rounded-card border border-line bg-white px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-wide text-ink-muted">Gulf Readiness</span>
        <span className="rounded-full bg-canvas px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide text-ink-muted">
          {result.scenarioLabel}
        </span>
      </div>
      <p className="mt-0.5 text-[12px] text-ink-muted">
        How ready you are for the Gulf job market — different from how complete your profile is.
      </p>
      <div className="mt-2 flex items-end gap-2">
        <span className={`font-mono text-3xl font-bold ${tone}`}>{result.finalScore}</span>
        <span className="pb-1 text-[12px] text-ink-muted">/ 100 · {result.band.label}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${result.band.key === 'ready' ? 'bg-teal' : result.band.key === 'mid' ? 'bg-teal' : 'bg-alert'}`}
          style={{ width: `${result.finalScore}%` }}
        />
      </div>
      <p className="mt-2.5 text-[12px] leading-snug text-ink-soft">
        Your score improves as you complete your profile. {result.recommendations[0]?.title ? `Next: ${result.recommendations[0].title.toLowerCase()}.` : 'Add more detail to strengthen it.'}
      </p>
    </div>
  )
}
