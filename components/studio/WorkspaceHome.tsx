'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowRightIcon, ChevronRightIcon, ChatBubbleLeftRightIcon, DocumentTextIcon, EnvelopeIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon, UserCircleIcon, SunIcon } from '@heroicons/react/24/outline'
import { buttonVariants } from '@/components/ui/Button'
import { HowItWorks } from '@/components/journey/HowItWorks'
import { HomeUpcomingDates } from '@/components/dashboard/HomeFollowThrough'
import { InterviewProgressOverview } from '@/components/dashboard/InterviewProgressOverview'
import { loadHomeInterview, unfinishedInterviewWorkspace, type HomeInterview } from '@/lib/homeInterview'
import { nextActionWorkspace } from '@/lib/homeFollowThrough'
import { GULF_COUNTRIES } from '@/lib/utils'
import type { NextAction } from '@/lib/nextAction'
import type { DashboardOverview } from '@/lib/dashboardOverview'
import type { PackageSummary } from '@/lib/packageSummary'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { GulfReadinessResult } from '@/lib/gulfReadiness/types'

type Props = {
  profile: CareerProfileFull | null; profileLoaded: boolean; profileError: boolean
  score: number; missing: string[]; gulf: GulfReadinessResult | null
  packages: PackageSummary[]; packagesLoaded: boolean; packagesError: boolean
  overview: DashboardOverview | null; overviewLoading: boolean; overviewError: boolean
  nextAction: NextAction; ready: boolean; error: boolean; now: Date; onRetryOverview: () => void
}

/** Presentation of existing decisions and real aggregate totals; never generates work. */
export function WorkspaceHome(p: Props) {
  const ongoing = !['no_profile', 'draft_waiting'].includes(p.nextAction.state) ? unfinishedInterviewWorkspace(p.packages) : null
  const ongoingId = p.ready && !p.error ? ongoing?.id : undefined
  const [interview, setInterview] = useState<HomeInterview | null>(null)
  useEffect(() => {
    if (!ongoingId) return
    const controller = new AbortController()
    void loadHomeInterview(ongoingId, fetch, controller.signal)
      .then(value => { if (!controller.signal.aborted) setInterview(value) })
      .catch(() => { if (!controller.signal.aborted) setInterview(null) })
    return () => controller.abort()
  }, [ongoingId, ongoing?.updated_at])
  const savedInterview = interview?.packageId === ongoingId ? interview : null
  const workspace = ongoing ?? nextActionWorkspace(p.nextAction, p.packages) ?? p.packages[0]
  const href = ongoing ? savedInterview?.href ?? `/mock-interview?package=${encodeURIComponent(ongoing.id)}` : p.nextAction.href
  const available = p.profileLoaded && !p.profileError && Boolean(p.profile)
  const retry = () => window.location.reload()
  const work = [
    { label: 'Resumes', href: '/dashboard/library', count: p.overview?.resume_count, Icon: DocumentTextIcon },
    { label: 'Cover letters', href: '/cover-letter', count: p.overview?.cover_letter_count, Icon: EnvelopeIcon },
    { label: 'Interview Q&A', href: '/interview-qa', count: p.overview?.qa_set_count, Icon: QuestionMarkCircleIcon },
    { label: 'Mock interviews', href: '/mock-interview', count: p.overview?.mock_interview_count, Icon: ChatBubbleLeftRightIcon },
  ]
  return <main className="studio-page studio-home">
    <header className="studio-personal-hero">
      <SunIcon className="studio-greeting-sun" aria-hidden="true" />
      <div><p className="type-helper text-ink-soft">Your next opportunity starts here</p><h1>{p.profile?.full_name || 'Your career workspace'}</h1><p>{p.profile?.target_job_title || 'Build your Career Profile'}</p></div>
      {p.profile?.photo_url ? <Image src={p.profile.photo_url} width={64} height={64} unoptimized alt="" className="studio-home-avatar" /> : null}
    </header>
    <div className="studio-home-quick-actions" aria-label="Quick actions">
      <Link href="/dashboard/library" className={buttonVariants({variant:'primary',size:'sm'})}><DocumentTextIcon aria-hidden="true" className="size-5" />My resumes</Link>
      <Link href="/profile?view=details" className={buttonVariants({variant:'secondary',size:'sm'})}><UserCircleIcon aria-hidden="true" className="size-5" />Update Career Profile</Link>
    </div>
    <div className="studio-home-grid">
      <aside className="studio-home-context" aria-label="Your profile and next steps">
        <section className="studio-readiness">
          <div className="studio-section-heading"><h2><Link href="/profile?view=completeness">Profile completeness</Link></h2><strong>{available ? p.score : '—'} <span>/100</span></strong></div>
          <progress max={100} value={available ? p.score : undefined} aria-label="Profile completeness" aria-valuetext={available ? undefined : 'Unavailable'} />
          {p.profileError ? <button type="button" className="studio-text-link" onClick={retry}>Profile unavailable · Try again</button> : p.profileLoaded && (p.missing.length > 0 || !p.profile) ? <Link href={p.profile ? '/profile?view=completeness' : '/profile?import=upload'} className={p.missing.length ? 'studio-attention' : 'studio-text-link'}>{p.missing.length ? <ExclamationTriangleIcon aria-hidden="true" /> : null}<span>{!p.profile ? 'Create your profile' : `Review ${p.missing.length} missing ${p.missing.length === 1 ? 'detail' : 'details'}`}</span><ChevronRightIcon aria-hidden="true" /></Link> : !p.profileLoaded ? <p role="status">Loading profile…</p> : null}
          {available ? <Link href="/profile?view=readiness" className="studio-gulf-link">Gulf preparation<span>{p.gulf ? `${p.gulf.finalScore}/100` : 'Review'}<ChevronRightIcon aria-hidden="true" /></span></Link> : null}
        </section>
        <section className="studio-next-improvements"><h2>Next improvements</h2>{p.missing.length ? p.missing.slice(0, 2).map(label => <Link key={label} href="/profile?view=completeness" className="studio-improvement"><UserCircleIcon aria-hidden="true" /><span><strong>{label}</strong><span>Review profile details<ArrowRightIcon aria-hidden="true" /></span></span></Link>) : <Link href="/mock-interview" className="studio-improvement"><ChatBubbleLeftRightIcon aria-hidden="true" /><span><strong>Review your interview practice</strong><span>Open saved attempts<ArrowRightIcon aria-hidden="true" /></span></span></Link>}</section>
      </aside>
      <div className="studio-home-work">
        {p.packagesError ? <div role="alert" className="studio-notice">Your resumes could not be loaded. <button type="button" onClick={retry}>Try again</button></div> : workspace ? <Link href={`/package/${encodeURIComponent(workspace.id)}`} className="studio-resume-context"><DocumentTextIcon aria-hidden="true" /><span><strong>{p.profile?.full_name || workspace.name || workspace.target_job_title}</strong><span>{[workspace.target_job_title, GULF_COUNTRIES.find(country => country.value === workspace.target_country)?.label || workspace.target_country?.replaceAll('_', ' ')].filter(Boolean).join(' · ')}</span><span className="studio-context-action">Open resume<ArrowRightIcon aria-hidden="true" /></span></span></Link> : available && p.profile ? <Link href="/profile" className="studio-resume-context">{p.profile.photo_url ? <Image src={p.profile.photo_url} width={52} height={60} unoptimized alt="" /> : <UserCircleIcon aria-hidden="true" />}<span><strong>{p.profile.full_name}</strong><span>Career Profile</span><span className="studio-context-action">Open profile<ArrowRightIcon aria-hidden="true" /></span></span></Link> : null}
        <section className="studio-continue" aria-label="Your next step" aria-busy={!p.ready && !p.error}>
          <div className="studio-continue-heading"><ChatBubbleLeftRightIcon aria-hidden="true" /><div><h2>{p.error ? 'Saved progress unavailable' : !p.ready ? 'Loading your workspace…' : ongoing ? 'Continue your interview' : p.nextAction.title}</h2>{p.ready && ongoing ? <p>{savedInterview?.saved != null ? `${savedInterview.saved} of ${savedInterview.total} answers saved` : 'Saved interview · In progress'}</p> : p.ready && workspace ? <p>{workspace.target_job_title}</p> : null}</div></div>
          {p.ready && savedInterview?.saved != null && savedInterview.total > 0 ? <progress max={savedInterview.total} value={savedInterview.saved} aria-label="Saved interview answers" /> : null}
          {p.error ? <button type="button" onClick={retry} className={buttonVariants({ variant: 'primary' })}>Try again</button> : p.ready ? <Link href={href} className={buttonVariants({ variant: 'primary' })}>{ongoing ? 'Continue practice' : p.nextAction.cta}<ArrowRightIcon aria-hidden="true" /></Link> : null}
          {p.ready && !ongoing && p.nextAction.state === 'no_profile' ? <div className="studio-inline-links"><Link href="/profile?import=paste">Paste resume</Link><Link href="/profile?view=details">Enter details</Link></div> : null}
        </section>
        {!p.overviewError && (p.overview?.mock_in_progress_count ?? 0) > 0 && !ongoing ? <Link href="/mock-interview" className="studio-notice">{p.overview!.mock_in_progress_count} saved interviews in progress<ArrowRightIcon aria-hidden="true" /></Link> : null}
        <section className="studio-saved-work" aria-busy={p.overviewLoading}><h2>Your preparation in numbers</h2>{p.overviewError ? <div role="alert" className="studio-notice">Saved totals unavailable. <button type="button" onClick={p.onRetryOverview}>Try again</button></div> : null}
          <div className="studio-work-table">{work.map(row => <Link key={row.href} href={row.href} className="studio-work-row"><row.Icon aria-hidden="true" /><span className="studio-work-label">{row.label}</span><span className="studio-work-count">{p.overviewLoading ? '…' : p.overviewError || row.count === undefined ? '—' : row.count}</span></Link>)}</div>
        </section>
      </div>
    </div>
    
    <section className="studio-performance-section" aria-label="My interview performance"><h2>My interview performance</h2><InterviewProgressOverview /></section>
    <HomeUpcomingDates packages={p.packages} now={p.now} loading={!p.packagesLoaded} error={p.packagesError} onRetry={retry} />
    <div className="studio-home-help"><HowItWorks /></div>
  </main>
}
