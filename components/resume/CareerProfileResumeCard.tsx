'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/Button'
import { CAREER_RESUME_BADGE, CAREER_RESUME_NAME } from '@/lib/careerProfileResume'

export function CareerProfileResumeCard() {
  const [resume, setResume] = useState<{ id: string; name: string | null } | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setState('loading')
    fetch('/api/packages/career-profile', { method: 'POST' })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((data) => {
        if (!active) return
        setResume(data.package)
        setState(data.package ? 'ready' : 'missing')
      })
      .catch(() => { if (active) setState('error') })
    return () => { active = false }
  }, [retry])
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-white p-4 shadow-m-1 sm:p-5">
      <span className="self-start rounded-full bg-teal-soft px-3 py-1 text-[12px] font-semibold text-teal">{CAREER_RESUME_BADGE}</span>
      <h2 className="break-words type-card text-ink">{resume?.name || CAREER_RESUME_NAME}</h2>
      <p className="text-[13px] text-ink-soft">Your latest saved Career Profile, professionally formatted. No AI optimization, job description or optimization credits required.</p>
      {state === 'loading' ? <p role="status" className="text-[13px] text-ink-muted">Opening your resume…</p> : null}
      {state === 'ready' && resume ? (
        <div className="flex flex-wrap gap-2">
          <Link href={`/package/${encodeURIComponent(resume.id)}?tab=design`} className={buttonVariants({ variant: 'primary', size: 'sm' })}>Customize and download</Link>
          <Link href="/profile?view=details" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>Edit Career Profile</Link>
        </div>
      ) : null}
      {state === 'missing' ? <Link href="/profile?view=details" className={buttonVariants({ variant: 'primary', size: 'sm' })}>Save your Career Profile to create this resume</Link> : null}
      {state === 'error' ? <div role="alert"><p className="text-[13px] text-alert">Could not load your Career Profile Resume.</p><button type="button" onClick={() => setRetry((n) => n + 1)} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>Try again</button></div> : null}
    </article>
  )
}
