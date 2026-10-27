'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ArrowRight, TrendingUp, Target, Sparkles, Flag, Brain, BriefcaseBusiness, Globe2, MessageSquare, Check } from 'lucide-react'
import { INTERVIEW_METRICS, type InterviewProgress as Progress } from '@/lib/interviewProgress'
import { CoachingCards } from './CoachingCards'
import { InterviewComparison } from './InterviewComparison'

function change(value: number) { return `${value > 0 ? '+' : ''}${value}` }
type Metric = typeof INTERVIEW_METRICS[number]['key']
const AREAS = {
  overall_score: { icon: TrendingUp, ink: 'var(--ui-accent-ink)', soft: 'var(--ui-brand-soft)' },
  technical_score: { icon: Brain, ink: 'var(--ui-accent-ink)', soft: 'var(--ui-brand-soft)' },
  role_fit_score: { icon: BriefcaseBusiness, ink: 'var(--ui-accent-ink)', soft: 'var(--ui-brand-soft)' },
  gulf_readiness_score: { icon: Globe2, ink: 'var(--ui-accent-ink)', soft: 'var(--ui-brand-soft)' },
  answer_structure_score: { icon: MessageSquare, ink: 'var(--ui-accent-ink)', soft: 'var(--ui-brand-soft)' },
} as const

export function InterviewProgress({ progress, packageId, compact = false, onPractice }: { progress: Progress; packageId: string; compact?: boolean; onPractice?: () => void }) {
  const [metric, setMetric] = useState<Metric>('overall_score')
  const [focusedId, setFocusedId] = useState(progress.selectedId)
  const chartId = useId()
  const overall = progress.metrics[0]
  const improved = progress.metrics.slice(1).filter(m => m.fromFirst !== null && m.fromFirst > 0)
  const focus = progress.timeline.find(p => p.id === focusedId) ?? progress.timeline.at(-1)!
  const metricLabel = INTERVIEW_METRICS.find(m => m.key === metric)!.label
  const area = AREAS[metric]
  const matching = progress.timeline.filter(p => p.comparable)
  const first = matching[0]
  const strongest = progress.metrics.slice(1).reduce((best, m) => m.score > best.score ? m : best)
  const x = (index: number) => progress.timeline.length === 1 ? 175 : 30 + index * 290 / (progress.timeline.length - 1)
  const y = (score: number) => 140 - score * 1.1
  const comparablePoints = progress.timeline.flatMap((point, i) => point.comparable ? [{ x: x(i), y: y(point.scores[metric]) }] : [])
  const points = comparablePoints.map(p => `${p.x},${p.y}`).join(' ')
  const fillPath = comparablePoints.length > 1 ? `M ${comparablePoints[0].x} 140 L ${comparablePoints.map(p => `${p.x} ${p.y}`).join(' L ')} L ${comparablePoints.at(-1)!.x} 140 Z` : ''
  return <section className="practice-journey min-w-0 overflow-hidden rounded-card border border-line bg-white" aria-label="Interview progress report">
    <div className="border-b border-line p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="type-caption text-teal">YOUR INTERVIEW PRACTICE</p><h2 className="mt-2 type-section text-ink">Your progress journey</h2><p className="mt-2 type-helper text-ink-muted">{progress.mode.replaceAll('_', ' ')} · {progress.difficulty} · {progress.questionCount} questions</p></div><span className="rounded-lg bg-teal-soft px-3 py-2 type-caption text-teal">{progress.totalAttempts} saved attempts</span></div>
      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1"><strong className="type-stat tabular-nums text-teal">{overall.score}<span className="type-helper font-normal text-ink-muted">/100</span></strong><span className="type-helper text-ink-muted">Latest overall score</span></div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-teal-soft" aria-hidden="true"><div className="h-full rounded-full bg-teal" style={{ width: `${overall.score}%` }} /></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{[{ label: 'Since first matching practice', value: overall.fromFirst }, { label: 'Vs previous matching practice', value: overall.delta }].map(stat => <div key={stat.label} className="rounded-lg bg-canvas px-3 py-3"><p className="type-helper text-ink-muted">{stat.label}</p><p className={`mt-1 type-label tabular-nums ${stat.value !== null && stat.value < 0 ? 'text-gold-ink' : 'text-teal'}`}>{stat.value === null ? 'Your baseline' : `${change(stat.value)} pts`}</p></div>)}</div>
    </div>
    <div className="space-y-6 p-4 sm:p-6">
      <InterviewComparison key={progress.selectedId} progress={progress} />
      <details className="group border-y border-line py-3"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 type-label text-teal [&::-webkit-details-marker]:hidden">Explore all practice scores<ArrowRight size={18} className="group-open:rotate-90" aria-hidden="true" /></summary><div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="type-card">Explore a score area</h3><span className="type-caption text-ink-muted">Tap an area to explore</span></div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{progress.metrics.slice(1).map(m => {
        const visual = AREAS[m.key], Icon = visual.icon
        return <button key={m.key} type="button" aria-label={`Explore ${m.label}`} aria-pressed={metric === m.key} onClick={() => setMetric(m.key)} className="practice-skill min-w-0 rounded-xl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal" style={{ background: visual.soft, borderColor: metric === m.key ? visual.ink : 'transparent', color: visual.ink }}>
          <span className="flex items-center justify-between gap-2"><span className="grid size-8 place-items-center rounded-lg bg-white/80"><Icon size={18} aria-hidden="true" /></span><ArrowUpRight size={15} aria-hidden="true" /></span><span className="mt-3 block type-helper text-ink-soft">{m.label}</span><strong className="mt-2 block type-card">{m.score}<span className="type-caption font-normal">/100</span></strong><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/80"><span className="practice-skill-bar block h-full rounded-full" style={{ width: `${m.score}%`, background: visual.ink }} /></span><span className="mt-2 block type-caption">{m.fromFirst === null ? 'Your starting point' : `${change(m.fromFirst)} since first`}</span><span className="mt-1 block type-caption text-ink-muted">{m.delta === null ? 'Repeat to compare' : `${change(m.delta)} vs previous`}</span>
        </button>
      })}</div>
      <div className="mt-5 rounded-xl border border-line p-3 sm:p-4" >
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="type-card">Score journey</h3><p className="mt-1 type-helper text-ink-muted">Every dot is a saved practice</p></div><label className="flex min-w-0 max-w-full items-center gap-2"><span className="sr-only">Compare score area</span><select aria-label="Compare score area" value={metric} onChange={e => setMetric(e.target.value as Metric)} className="field min-h-11 max-w-full py-1">{INTERVIEW_METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label></div>
        <svg key={metric} viewBox="0 0 350 165" className="mt-3 block max-h-60 w-full" role="img" aria-labelledby={chartId}>
          <title id={chartId}>{metricLabel} scores: {progress.timeline.map(p => `mock interview ${p.number}: ${p.scores[metric]}${p.comparable ? '' : ', different settings'}`).join('; ')}</title>
          <defs><linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={area.ink} stopOpacity="0.26" /><stop offset="100%" stopColor={area.ink} stopOpacity="0.02" /></linearGradient></defs>
          {[0, 50, 100].map(score => <g key={score}><line x1="30" x2="320" y1={y(score)} y2={y(score)} stroke="var(--ui-line)" strokeDasharray="4 4" /><text x="20" y={y(score) + 4} textAnchor="end" fill="var(--ui-muted)" fontSize="14">{score}</text></g>)}
          {fillPath && <path d={fillPath} fill={`url(#${chartId}-fill)`} />}
          {progress.comparableCount > 1 && <polyline className="practice-chart-line" points={points} fill="none" stroke={area.ink} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" pathLength="1" />}
          {progress.timeline.map((point, i) => <g key={point.id}>{point.id === focus.id && <circle cx={x(i)} cy={y(point.scores[metric])} r="11" fill={point.comparable ? area.ink : 'var(--ui-muted)'} opacity="0.13" />}<circle cx={x(i)} cy={y(point.scores[metric])} r={point.id === focus.id ? 6 : 4} fill={point.comparable ? area.ink : 'var(--ui-muted)'} stroke="var(--ui-surface)" strokeWidth="2" />{(progress.timeline.length <= 6 || i === 0 || i === progress.timeline.length - 1) && <text x={x(i)} y="160" textAnchor="middle" fill="var(--ui-muted)" fontSize="14">#{point.number}</text>}</g>)}
        </svg>
        <div className="flex flex-wrap gap-2 pb-1" aria-label="Explore interview scores">{progress.timeline.map(point => <button key={point.id} type="button" aria-pressed={point.id === focus.id} onClick={() => setFocusedId(point.id)} className="practice-skill min-h-11 shrink-0 rounded-lg border px-3" style={{ borderColor: point.id === focus.id ? area.ink : 'var(--ui-line)', background: point.id === focus.id ? area.soft : 'var(--ui-surface)', color: point.comparable ? area.ink : 'var(--ui-muted)' }}>#{point.number} · {point.scores[metric]}</button>)}</div>
        <p role="status" className="mt-3 type-helper text-ink-soft">Mock interview {focus.number} · {metricLabel}: {focus.scores[metric]}/100{!focus.comparable ? ' · different settings' : ''}</p>
        {progress.comparableCount === 1 ? <p className="mt-2 type-helper text-ink-muted">This is your baseline. Repeat the same settings and saved resume to start a comparable trend.</p> : <p className="mt-2 type-helper text-ink-muted">{progress.comparableCount} matching interviews · Coloured points form your comparable trend.</p>}
        {progress.timeline.some(p => !p.comparable) && <p className="mt-1 type-helper text-ink-muted">Grey points show other settings. Their scores are separate baselines.</p>}
      </div>
      </div></details>
      <ol aria-label="Practice milestones" className="relative mt-5 grid grid-cols-3 gap-2"><li aria-hidden="true" className="absolute inset-x-[16%] top-4 h-px list-none bg-line" />{[{ label: 'First matching', detail: `#${first.number} · ${first.scores.overall_score}/100`, icon: Flag, soft: 'bg-teal-soft text-teal' }, { label: 'Latest review', detail: `#${progress.attemptNumber} · ${overall.score}/100`, icon: Check, soft: 'bg-teal-soft text-teal' }, { label: 'Next practice', detail: 'Build on your feedback', icon: Target, soft: 'bg-gold-soft text-gold-text' }].map(milestone => <li key={milestone.label} className="relative min-w-0 text-center"><span className={`mx-auto grid size-8 place-items-center rounded-full ring-4 ring-white ${milestone.soft}`}><milestone.icon size={15} aria-hidden="true" /></span><p className="mt-3 type-helper text-ink-soft">{milestone.label}</p><p className="mt-1 type-helper text-ink-muted">{milestone.detail}</p></li>)}</ol>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-teal/10 bg-teal-soft/60 p-4"><h3 className="flex items-center gap-2 type-card"><Sparkles size={18} className="text-teal" aria-hidden="true" />What improved since your first matching practice</h3>{improved.length ? <ul className="mt-3 space-y-2">{improved.map(m => <li key={m.key} className="flex flex-wrap items-center justify-between gap-2"><span className="type-helper">{m.label}</span><span className="rounded-full bg-white px-2 py-1 type-caption text-teal">{change(m.fromFirst!)} pts</span></li>)}</ul> : <p className="mt-3 type-helper text-ink-soft">{overall.fromFirst === null ? 'Your first matching result sets the starting point.' : 'No increases in these areas yet. Your next practice can build on this feedback.'}</p>}<p className="mt-3 border-t border-teal/10 pt-3 type-helper text-teal">Highest current score: {strongest.label} · {strongest.score}/100</p></div>
        <div className="rounded-xl border border-gold/20 bg-gold-soft/50 p-4"><h3 className="flex items-center gap-2 type-card"><Target size={18} className="text-gold-text" aria-hidden="true" />Latest areas to strengthen</h3><ul className="mt-3 space-y-2">{progress.metrics.slice(1).filter(m => m.score < 85).sort((a, b) => a.score - b.score).slice(0, 2).map(m => <li key={m.key} className="flex flex-wrap items-center justify-between gap-2"><span className="type-helper">{m.label}</span><span className="rounded-full bg-white px-2 py-1 type-caption text-gold-text">{m.score}/100</span></li>)}</ul>{progress.metrics.slice(1).every(m => m.score >= 85) && <p className="mt-3 type-helper">Maintain these scores and practise fresh examples.</p>}<p className="mt-3 border-t border-gold/20 pt-3 type-helper text-gold-text">Choose one focus for your next attempt.</p></div>
      </div>
      <div className="mt-5"><CoachingCards items={progress.nextSteps.slice(0, compact ? 2 : 3)} title="Your next moves" /></div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-teal-soft/60 p-4"><div><h3 className="type-card text-teal">Ready for your next practice?</h3><p className="mt-1 type-helper text-ink-soft">Use your feedback. Try again. See what changes.</p></div>{onPractice ? <button type="button" onClick={onPractice} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal px-4 py-2 text-white">Choose my next practice<ArrowRight size={17} aria-hidden="true" /></button> : <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal px-4 py-2 text-white" href={`/mock-interview?package=${encodeURIComponent(packageId)}`}>Explore your interview journey<ArrowRight size={17} aria-hidden="true" /></Link>}</div>
      <p className="mt-4 type-helper text-ink-muted">Practice guidance, not hiring odds. Comparisons require the same saved resume, mode, difficulty, length and rubric; questions may differ.</p>
    </div>
  </section>
}
