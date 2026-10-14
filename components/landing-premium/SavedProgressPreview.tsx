'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChartNoAxesCombined, RefreshCw } from 'lucide-react'
import { INTERVIEW_METRICS, type ResumeInterviewProgress } from '@/lib/interviewProgress'
import s from './premium.module.css'

type Metric = typeof INTERVIEW_METRICS[number]['key']
export function SavedProgressPreview() {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'guest' | 'ready' | 'error'>('loading')
  const [reports, setReports] = useState<ResumeInterviewProgress[]>([])
  const [reportIndex, setReportIndex] = useState(0)
  const [metric, setMetric] = useState<Metric>('overall_score')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      setState('loading')
      void fetch('/api/mock-interview/progress', { cache: 'no-store', signal: controller.signal })
        .then(async response => {
          if (response.status === 401) { setState('guest'); return }
          if (!response.ok) throw new Error('Unavailable')
          const data = await response.json() as { progress: ResumeInterviewProgress[] }
          if (!Array.isArray(data.progress)) throw new Error('Unavailable')
          if (!controller.signal.aborted) { setReports(data.progress); setState('ready') }
        }).catch(() => { if (!controller.signal.aborted) setState('error') })
    }, { rootMargin: '160px' })
    if (ref.current) observer.observe(ref.current)
    return () => { observer.disconnect(); controller.abort() }
  }, [retry])
  const report = reports[reportIndex]
  const points = report?.progress.timeline.filter(point => point.comparable) ?? []
  const label = INTERVIEW_METRICS.find(item => item.key === metric)!.label
  const x = (i: number) => points.length === 1 ? 250 : 48 + i * 420 / Math.max(1, points.length - 1)
  const y = (score: number) => 200 - score * 1.6
  return <div ref={ref} className={s.savedProgress} aria-label="Your saved interview progress">
    <div className={s.savedProgressHead}><span><ChartNoAxesCombined size={20}/> YOUR SAVED SESSIONS</span><span>Scores out of 100</span></div>
    <h3>See your practice over time.</h3>
    <p>Compare completed interviews with the same resume and practice settings.</p>
    {reports.length > 1 ? <label className={s.reportPicker}>Choose a preparation history<select value={reportIndex} onChange={event => setReportIndex(Number(event.target.value))}>{reports.map((item, i) => <option key={item.packageId} value={i}>{item.progress.mode.replaceAll('_', ' ')} · {item.progress.questionCount} questions · {item.progress.comparableCount} matching sessions</option>)}</select></label> : null}
    {points.length ? <>
      <div className={s.metricPicker} aria-label="Choose a score to compare">{INTERVIEW_METRICS.map(item => <button key={item.key} type="button" aria-pressed={metric === item.key} onClick={() => setMetric(item.key)}>{item.label}</button>)}</div>
      <svg viewBox="0 0 500 244" className={s.sessionChart} role="img" aria-label={`${label}: ${points.map(point => `session ${point.number}, ${point.scores[metric]} out of 100`).join('; ')}`}>
        {[0, 25, 50, 75, 100].map(score => <g key={score}><line x1="48" x2="468" y1={y(score)} y2={y(score)} stroke="currentColor" opacity=".12"/><text x="35" y={y(score)+4} textAnchor="end">{score}</text></g>)}
        {points.length > 1 ? <polyline points={points.map((point, i) => `${x(i)},${y(point.scores[metric])}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/> : null}
        {points.map((point, i) => <g key={point.id}><circle cx={x(i)} cy={y(point.scores[metric])} r="5" fill="currentColor"/><title>{`Session ${point.number}: ${point.scores[metric]}`}</title><text x={x(i)} y="225" textAnchor="middle">{point.number}</text></g>)}
      </svg>
      <p className={s.chartStatus}>{points.length === 1 ? 'Your first matching session establishes a baseline.' : `${points.length} matching sessions · Changes may rise or fall.`}</p>
    </> : <div className={s.progressEmpty} role="status"><ChartNoAxesCombined size={40}/><strong>{state === 'loading' ? 'Checking for saved sessions…' : state === 'error' ? 'Your progress could not be loaded.' : state === 'guest' ? 'Your practice. Your progress.' : 'Your first interview starts the journey.'}</strong><p>{state === 'error' ? 'Try again, or open your saved reports.' : 'After your first completed interview, see your baseline. Repeat with matching settings to compare your scores.'}</p>{state === 'error' ? <button type="button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={16}/>Try again</button> : null}</div>}
    <Link href={state === 'guest' ? '/login?next=%2Fdashboard' : '/dashboard'} className={s.textLink}>{state === 'guest' ? 'Sign in to see my progress' : 'Open my saved progress'} <ArrowRight size={17}/></Link>
  </div>
}
