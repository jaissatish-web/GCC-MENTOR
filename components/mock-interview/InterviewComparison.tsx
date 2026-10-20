'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { INTERVIEW_METRICS, type InterviewProgress } from '@/lib/interviewProgress'

const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`

/** Presentation only: the existing progress model decides which runs match. */
export function InterviewComparison({ progress }: { progress: InterviewProgress }) {
  const matching = progress.timeline.filter(point => point.comparable)
  const [earlierId, setEarlierId] = useState(matching.at(-2)?.id ?? matching[0].id)
  const [laterId, setLaterId] = useState(matching.at(-1)!.id)
  if (matching.length < 2) return <div className="rounded-xl bg-teal-soft/50 p-4"><h3 className="type-card text-teal">Your starting point</h3><p className="mt-2 type-helper text-ink-soft">Complete another interview with the same saved resume and settings to compare your results.</p></div>

  const earlierIndex = Math.max(0, Math.min(matching.findIndex(point => point.id === earlierId), matching.length - 2))
  const laterIndex = Math.max(earlierIndex + 1, matching.findIndex(point => point.id === laterId))
  const earlier = matching[earlierIndex], later = matching[laterIndex]
  const delta = later.scores.overall_score - earlier.scores.overall_score
  return <section aria-label="Compare matching interviews" className="space-y-5">
    <div><h3 className="type-card">See what changed.</h3><p className="mt-1 type-helper text-ink-muted">Compare two interviews from this resume.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-2"><span className="block type-label">Earlier interview</span><select className="field w-full" value={earlier.id} onChange={event => setEarlierId(event.target.value)}>{matching.slice(0, -1).map(point => <option key={point.id} value={point.id}>Interview {point.number}</option>)}</select></label>
      <label className="space-y-2"><span className="block type-label">Later interview</span><select className="field w-full" value={later.id} onChange={event => setLaterId(event.target.value)}>{matching.slice(earlierIndex + 1).map(point => <option key={point.id} value={point.id}>Interview {point.number}</option>)}</select></label>
    </div>
    <div className="flex flex-wrap items-center gap-4 border-y border-line py-5" aria-live="polite">
      <div><p className="type-helper text-ink-muted">Earlier overall</p><p className="mt-1 type-stat tabular-nums text-ink-soft">{earlier.scores.overall_score}</p></div>
      <ArrowRight size={22} className="text-ink-muted" aria-hidden="true" />
      <div><p className="type-helper text-ink-muted">Later overall</p><p className="mt-1 type-stat tabular-nums text-teal">{later.scores.overall_score}</p></div>
      <p className={`rounded-lg px-3 py-2 type-label ${delta < 0 ? 'bg-gold-soft text-gold-ink' : 'bg-teal-soft text-teal'}`}>{signed(delta)} points</p>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 type-caption text-ink-muted"><span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-5 rounded-sm bg-gold-ink" />Interview {earlier.number}</span><span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-5 rounded-sm bg-teal" />Interview {later.number}</span><span>Scores out of 100</span></div>
    <dl className="space-y-5" aria-label="Skill score comparison">{INTERVIEW_METRICS.slice(1).map(({ key, label }) => {
      const difference = later.scores[key] - earlier.scores[key]
      return <div key={key}><div className="flex flex-wrap items-baseline justify-between gap-2"><dt className="type-label">{label}</dt><dd className={`type-caption tabular-nums ${difference < 0 ? 'text-gold-ink' : 'text-teal'}`}>{signed(difference)} pts</dd></div><dd className="mt-2 space-y-2">{[{ point: earlier, color: 'bg-gold-ink' }, { point: later, color: 'bg-teal' }].map(({ point, color }) => <div key={point.id} className="flex items-center gap-3"><span className="sr-only">Interview {point.number}: {label}</span><span className="h-2.5 flex-1 overflow-hidden rounded-sm bg-teal-soft/60" aria-hidden="true"><span className={`block h-full rounded-sm transition-[width] duration-300 motion-reduce:transition-none ${color}`} style={{ width: `${point.scores[key]}%` }} /></span><span className="w-8 text-right type-helper tabular-nums">{point.scores[key]}<span className="sr-only"> out of 100</span></span></div>)}</dd></div>
    })}</dl>
    <div aria-hidden="true" className="mr-11 flex justify-between border-t border-line pt-2 type-caption text-ink-muted"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
    <p className="type-helper text-ink-muted">Same saved resume, answer format, focus, difficulty, length and scoring rubric. Questions may differ.</p>
  </section>
}
