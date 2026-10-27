'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { InterviewProgress } from '@/components/mock-interview/InterviewProgress'
import { buttonVariants } from '@/components/ui/Button'
import styles from '../studio/WorkspaceHome.module.css'
import type { ResumeInterviewProgress } from '@/lib/interviewProgress'

export function InterviewProgressOverview({ compact = false }: { compact?: boolean } = {}) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [data, setData] = useState<{ attempts: number; progress: ResumeInterviewProgress[] } | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async (active: () => boolean = () => true) => {
    setLoading(true); setError(false)
    try {
      const response = await fetch('/api/mock-interview/progress', { cache: 'no-store' })
      if (!response.ok) throw new Error('Unavailable')
      const payload = await response.json()
      if (active()) setData(payload)
    } catch { if (active()) setError(true) }
    finally { if (active()) setLoading(false) }
  }, [])
  useEffect(() => { let active = true; void load(() => active); return () => { active = false } }, [load])
  const selected = data?.progress.find(item => item.packageId === selectedPackage) ?? data?.progress[0]
  if (compact) return <div className={styles.performance} aria-busy={loading}>
    <div className={styles.heading}><h2>Interview performance</h2><Link href="/mock-interview" className={styles.textLink}>All interviews</Link></div>
    {loading ? <p role="status" className={styles.muted}>Loading interview progress…</p> : error ? <div role="alert" className={styles.notice}>Could not load interview progress. <button type="button" onClick={() => void load()}>Try again</button></div> : selected ? <>
      {data && data.progress.length > 1 ? <label className={styles.practiceSelect}><span>Resume practice history</span><select value={selected.packageId} onChange={event => setSelectedPackage(event.target.value)}>{data.progress.map((item, index) => <option key={item.packageId} value={item.packageId}>Resume {index + 1} · {item.progress.totalAttempts} attempts</option>)}</select></label> : null}
      <div className={styles.performanceSummary}><strong className="type-stat">{selected.progress.metrics[0].score}<span className={styles.muted}> /100</span></strong><span className={styles.muted}>Latest reviewed score</span></div>
      <p className={styles.practiceLabel}>{selected.progress.mode.replaceAll('_', ' ')} · {selected.progress.difficulty} · {selected.progress.questionCount} questions</p>
      <p className={styles.muted}>{selected.progress.metrics[0].fromFirst === null ? 'First comparable result · Your baseline' : `${selected.progress.metrics[0].fromFirst > 0 ? '+' : ''}${selected.progress.metrics[0].fromFirst} points since first matching practice`}</p>
      <div className={styles.metrics}>{selected.progress.metrics.slice(1).map(metric => <div className={styles.metric} key={metric.key}><span>{metric.label}</span><progress max={100} value={metric.score} aria-label={metric.label} /><span>{metric.score}</span></div>)}</div>
      <div className={styles.performanceFooter}><Link className={buttonVariants({variant:'primary',size:'sm'})} href={`/mock-interview?package=${encodeURIComponent(selected.packageId)}`}>Practise this interview</Link><Link className={styles.textLink} href={`/mock-interview?package=${encodeURIComponent(selected.packageId)}&run=${encodeURIComponent(selected.progress.selectedId)}#interview-report`}>View report & comparisons</Link></div>
    </> : <div className={styles.empty}><p>{data?.attempts ? 'Complete a saved interview review to see your scores.' : 'Complete your first mock interview to see your performance.'}</p><Link className={buttonVariants({variant:'primary',size:'sm'})} href="/mock-interview">Start a mock interview</Link></div>}
  </div>
  return <section className="space-y-4" aria-label="Your interview practice">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="type-section">Your interview practice</h2><Link href="/mock-interview" className="inline-flex min-h-11 items-center text-teal hover:underline">All interviews →</Link></div>
    {loading ? <p role="status" className="text-ink-muted">Loading interview progress…</p> : error ? <div className="ui-section"><p role="alert">Could not load your interview progress.</p><button className="mt-2 min-h-11 text-teal hover:underline" onClick={() => void load()}>Try again</button></div> : data?.progress.length ? <>
      <p className="text-sm text-ink-muted type-helper">{data.attempts} saved interviews · Each resume has its own practice history.</p>
      <div className="grid gap-4 lg:grid-cols-2">{data.progress.slice(0, 2).map(item => <InterviewProgress key={item.packageId} {...item} compact />)}</div>
    </> : <div className="ui-section"><p>{data?.attempts ? 'Complete your saved interview review to establish a progress baseline.' : 'Complete your first mock interview to start tracking your progress.'}</p><Link className="mt-3 inline-flex min-h-11 items-center text-teal hover:underline" href="/mock-interview">Practise an interview →</Link></div>}
  </section>
}
