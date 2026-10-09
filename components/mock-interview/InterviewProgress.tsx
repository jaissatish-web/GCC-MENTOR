'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Target, Sparkles } from 'lucide-react'
import { INTERVIEW_METRICS, type InterviewProgress as Progress } from '@/lib/interviewProgress'
import { CoachingCards } from './CoachingCards'

function change(value: number) { return `${value > 0 ? '+' : ''}${value}` }
type Metric = typeof INTERVIEW_METRICS[number]['key']

export function InterviewProgress({ progress, packageId, compact = false }: { progress: Progress; packageId: string; compact?: boolean }) {
  const [metric, setMetric] = useState<Metric>('overall_score')
  const [focusedId, setFocusedId] = useState(progress.selectedId)
  const chartId = useId()
  const overall = progress.metrics[0]
  const improved = progress.metrics.slice(1).filter(m => m.fromFirst !== null && m.fromFirst > 0)
  const focus = progress.timeline.find(p => p.id === focusedId) ?? progress.timeline.at(-1)!
  const metricLabel = INTERVIEW_METRICS.find(m => m.key === metric)!.label
  const x = (index: number) => progress.timeline.length === 1 ? 175 : 30 + index * 290 / (progress.timeline.length - 1)
  const y = (score: number) => 140 - score * 1.1
  const points = progress.timeline.flatMap((point, i) => point.comparable ? [`${x(i)},${y(point.scores[metric])}`] : []).join(' ')
  return <section className="ui-card min-w-0 overflow-hidden rounded-card border border-teal/20 bg-white p-4 sm:p-6" aria-label="Interview progress report">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-soft text-teal"><TrendingUp size={21} aria-hidden="true" /></span><div><h2 className="type-section">Your progress journey</h2><p className="mt-1 text-sm text-ink-muted">{progress.mode.replaceAll('_', ' ')} · {progress.difficulty} · {progress.questionCount} questions</p></div></div>
      <span className="rounded-full bg-canvas px-3 py-1.5 text-xs text-ink-muted">{progress.totalAttempts} saved attempts</span>
    </div>
    <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
      {[{ label: 'Latest score', value: `${overall.score}/100` }, { label: 'Since first', delta: overall.fromFirst, value: overall.fromFirst === null ? 'Baseline' : `${change(overall.fromFirst)} pts` }, { label: 'Vs previous', delta: overall.delta, value: overall.delta === null ? 'Baseline' : `${change(overall.delta)} pts` }].map(stat => <div key={stat.label} className="min-w-0 rounded-xl bg-teal-soft/60 px-3 py-3"><p className="text-xs text-ink-muted">{stat.label}</p><strong className={`mt-1 block break-words text-lg ${typeof stat.delta === 'number' && stat.delta < 0 ? 'text-gold-text' : 'text-teal'}`}>{stat.value}</strong></div>)}
    </div>
    <div className="mt-5 rounded-xl border border-line bg-canvas/40 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="type-card">Score journey</h3><label className="flex min-w-0 max-w-full items-center gap-2 text-xs"><span className="sr-only">Compare score area</span><select aria-label="Compare score area" value={metric} onChange={e => setMetric(e.target.value as Metric)} className="field min-h-11 max-w-full py-1">{INTERVIEW_METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label></div>
      <svg viewBox="0 0 350 165" className="mt-3 block max-h-60 w-full" role="img" aria-labelledby={chartId}>
        <title id={chartId}>{metricLabel} scores: {progress.timeline.map(p => `mock interview ${p.number}: ${p.scores[metric]}${p.comparable ? '' : ', different settings'}`).join('; ')}</title>
        {[0, 50, 100].map(score => <g key={score}><line x1="30" x2="320" y1={y(score)} y2={y(score)} stroke="#DCE5E1" strokeDasharray="4 4" /><text x="20" y={y(score) + 4} textAnchor="end" fill="#64716B" fontSize="14">{score}</text></g>)}
        {progress.comparableCount > 1 && <polyline points={points} fill="none" stroke="#0F5A55" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
        {progress.timeline.map((point, i) => <g key={point.id}><circle cx={x(i)} cy={y(point.scores[metric])} r={point.id === focus.id ? 6 : 4} fill={point.comparable ? '#0F5A55' : '#A2AAA6'} stroke="white" strokeWidth="2" />{(progress.timeline.length <= 6 || i === 0 || i === progress.timeline.length - 1) && <text x={x(i)} y="160" textAnchor="middle" fill="#64716B" fontSize="14">#{point.number}</text>}</g>)}
      </svg>
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Explore interview scores">{progress.timeline.map(point => <button key={point.id} type="button" aria-pressed={point.id === focus.id} onClick={() => setFocusedId(point.id)} className={`min-h-11 shrink-0 rounded-lg border px-3 text-sm ${point.id === focus.id ? 'border-teal bg-teal-soft text-teal' : 'border-line bg-white text-ink-muted'}`}>#{point.number} · {point.scores[metric]}</button>)}</div>
      <p role="status" className="mt-3 text-sm text-ink-muted">Mock interview {focus.number} · {metricLabel}: {focus.scores[metric]}/100{!focus.comparable ? ' · different settings' : ''}</p>
      {progress.comparableCount === 1 ? <p className="mt-2 text-xs text-ink-muted">This is your baseline. Repeat the same settings and saved resume to start a comparable trend.</p> : <p className="mt-2 text-xs text-ink-muted">{progress.comparableCount} matching interviews · Green points form your comparable trend.</p>}
      {progress.timeline.some(p => !p.comparable) && <p className="mt-1 text-xs text-ink-muted">Grey points show other settings. Their scores are separate baselines.</p>}
    </div>
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{progress.metrics.slice(1).map(m => <div key={m.key} className="min-w-0 rounded-xl border border-line p-3"><p className="text-xs text-ink-muted">{m.label}</p><strong className="mt-2 block text-lg text-ink">{m.score}<span className="text-xs text-ink-muted">/100</span></strong><p className={`mt-1 text-xs ${m.fromFirst !== null && m.fromFirst > 0 ? 'text-teal' : 'text-ink-muted'}`}>{m.fromFirst === null ? 'Baseline' : `${change(m.fromFirst)} since first`}</p><p className="mt-1 text-xs text-ink-muted">{m.delta === null ? 'Repeat to compare' : `${change(m.delta)} vs previous`}</p></div>)}</div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-teal-soft/60 p-4"><h3 className="flex items-center gap-2 type-card"><Sparkles size={18} className="text-teal" aria-hidden="true" />What improved</h3>{improved.length ? <ul className="mt-3 space-y-2">{improved.map(m => <li key={m.key} className="flex flex-wrap justify-between gap-2"><span>{m.label}</span><span className="text-teal">{change(m.fromFirst!)} pts</span></li>)}</ul> : <p className="mt-3 text-sm text-ink-soft">{overall.fromFirst === null ? 'Your first matching result sets the starting point.' : 'No increases in these areas yet. Your next practice can build on this feedback.'}</p>}</div>
      <div className="rounded-xl bg-gold-soft/50 p-4"><h3 className="flex items-center gap-2 type-card"><Target size={18} className="text-gold-text" aria-hidden="true" />Still to strengthen</h3><ul className="mt-3 space-y-2">{progress.metrics.slice(1).filter(m => m.score < 85).sort((a, b) => a.score - b.score).slice(0, 2).map(m => <li key={m.key} className="flex flex-wrap justify-between gap-2"><span>{m.label}</span><span className="text-gold-text">{m.score}/100</span></li>)}</ul>{progress.metrics.slice(1).every(m => m.score >= 85) && <p className="mt-3 text-sm">Maintain these scores and practise fresh examples.</p>}</div>
    </div>
    <div className="mt-5"><CoachingCards items={progress.nextSteps.slice(0, compact ? 2 : 3)} /></div>
    <p className="mt-4 text-xs text-ink-muted">Practice guidance, not hiring odds. Comparisons require the same saved resume, mode, difficulty, length and rubric; questions may differ.</p>
    {compact && <Link className="mt-4 inline-flex min-h-11 items-center font-semibold text-teal hover:underline" href={`/mock-interview?package=${encodeURIComponent(packageId)}`}>Explore your interview journey →</Link>}
  </section>
}
