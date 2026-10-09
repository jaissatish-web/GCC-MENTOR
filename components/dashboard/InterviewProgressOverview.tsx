'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { InterviewProgress } from '@/components/mock-interview/InterviewProgress'
import type { ResumeInterviewProgress } from '@/lib/interviewProgress'

export function InterviewProgressOverview() {
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
  return <section className="space-y-4" aria-label="Your interview practice">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="type-section">Your interview practice</h2><Link href="/mock-interview" className="inline-flex min-h-11 items-center text-teal hover:underline">All interviews →</Link></div>
    {loading ? <p role="status" className="text-ink-muted">Loading interview progress…</p> : error ? <div className="ui-card rounded-card border border-line bg-white p-4"><p role="alert">Could not load your interview progress.</p><button className="mt-2 min-h-11 text-teal hover:underline" onClick={() => void load()}>Try again</button></div> : data?.progress.length ? <>
      <p className="text-sm text-ink-muted">{data.attempts} saved interviews · Each resume has its own practice history.</p>
      <div className="grid gap-4 lg:grid-cols-2">{data.progress.slice(0, 2).map(item => <InterviewProgress key={item.packageId} {...item} compact />)}</div>
    </> : <div className="ui-card rounded-card border border-line bg-white p-4"><p>{data?.attempts ? 'Complete your saved interview review to establish a progress baseline.' : 'Complete your first mock interview to start tracking your progress.'}</p><Link className="mt-3 inline-flex min-h-11 items-center text-teal hover:underline" href="/mock-interview">Practise an interview →</Link></div>}
  </section>
}
