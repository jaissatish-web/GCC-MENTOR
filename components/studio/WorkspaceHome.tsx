'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowRightIcon, ChevronRightIcon, ChatBubbleLeftRightIcon, DocumentTextIcon, EnvelopeIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon, SunIcon, SparklesIcon, PlusIcon, PencilSquareIcon, CalendarDaysIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { buttonVariants } from '@/components/ui/Button'
import { HowItWorks } from '@/components/journey/HowItWorks'
import { InterviewProgressOverview } from '@/components/dashboard/InterviewProgressOverview'
import { loadHomeInterview, unfinishedInterviewWorkspace, type HomeInterview } from '@/lib/homeInterview'
import { homeReminders, reminderTiming, nextActionWorkspace } from '@/lib/homeFollowThrough'
import styles from './WorkspaceHome.module.css'
import { formatTrackerDate } from '@/lib/trackerDates'
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
  const latestRole = p.profile?.work_experience?.slice().sort((a, b) => (b.start_date || '').localeCompare(a.start_date || '') || a.sort_order - b.sort_order)[0]?.role
  const initials = p.profile?.full_name?.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('') || 'Me'
  const reminders = homeReminders(p.packages, p.now)
  const stages = [
    { key: 'applied', label: 'Applied' }, { key: 'shortlisted', label: 'Shortlisted' },
    { key: 'interview', label: 'Interview' }, { key: 'visa_processing', label: 'Visa' }, { key: 'offer', label: 'Offer' },
  ] as const
  const actions = [
    { label: 'Optimize for a new job', detail: 'Use your saved Career Profile', href: '/optimize/target', Icon: SparklesIcon },
    { label: 'My resumes', detail: 'Open your saved resumes', href: '/dashboard/library', Icon: DocumentTextIcon },
    { label: 'Update Career Profile', detail: 'Keep your details current', href: '/profile?view=details', Icon: PencilSquareIcon },
    { label: 'Add a job application', detail: 'Set up a job workspace', href: '/optimize/target', Icon: PlusIcon },
  ]
  return <main className={`studio-page studio-home ${styles.dashboard}`}>
    <header className={styles.profile} aria-busy={!p.profileLoaded}>
      <div className={styles.avatar}>{available && p.profile?.photo_url ? <Image src={p.profile.photo_url} width={80} height={80} unoptimized alt="" /> : <span aria-hidden="true">{p.profileLoaded && !p.profileError ? initials : '—'}</span>}</div>
      <div className={styles.identity}>
        <p className={styles.greeting}><SunIcon aria-hidden="true" />Your career workspace</p>
        <h1>{!p.profileLoaded ? 'Loading your profile…' : p.profileError ? 'Your career workspace' : p.profile?.full_name || 'Welcome to GCC Mentor'}</h1>
        {available ? <p className={styles.role}>{p.profile?.target_job_title || latestRole || 'Your Career Profile'}</p> : null}
        {available && p.profile?.current_location ? <span className={styles.chip}>{p.profile.current_location}</span> : null}
        {p.profileError ? <button type="button" onClick={retry} className={styles.textLink}>Profile unavailable · Try again</button> : p.profileLoaded && !p.profile ? <Link className={styles.textLink} href="/profile?view=details">Create Career Profile<ArrowRightIcon aria-hidden="true" /></Link> : null}
      </div>
      <Link className={styles.profileLink} href={available ? '/profile' : '/profile?view=details'} aria-label={available ? 'View Career Profile' : 'Create Career Profile'}><ChevronRightIcon aria-hidden="true" /></Link>
    </header>

    <div className={styles.pair}>
      <section className={styles.card} aria-labelledby="dashboard-readiness" aria-busy={!p.profileLoaded}>
        <div className={styles.heading}><h2 id="dashboard-readiness">Profile readiness</h2><Link href="/profile?view=completeness" className={styles.textLink}>View details<ChevronRightIcon aria-hidden="true" /></Link></div>
        <div className={styles.scoreLine}><strong className="type-stat">{available ? p.score : '—'}<span className={styles.muted}> /100</span></strong><span className={styles.muted}>Profile completeness</span></div>
        <progress className={styles.readinessBar} data-level={p.score < 50 ? 'low' : p.score < 70 ? 'medium' : 'high'} max={100} value={available ? p.score : undefined} aria-label="Profile completeness" aria-valuetext={available ? undefined : 'Unavailable'} />
        {p.profileError ? <button type="button" onClick={retry} className={styles.textLink}>Profile unavailable · Try again</button> : !p.profileLoaded ? <p role="status" className={styles.muted}>Loading profile…</p> : !p.profile ? <Link className={styles.textLink} href="/profile?view=details">Create your profile<ArrowRightIcon aria-hidden="true" /></Link> : <>
          {p.missing.length ? <ul className={styles.missing}>{p.missing.slice(0, 3).map(label => <li key={label}><Link href="/profile?view=completeness"><ExclamationTriangleIcon aria-hidden="true" /><span>{label}</span><span className={styles.muted}>Review<ChevronRightIcon aria-hidden="true" /></span></Link></li>)}</ul> : <p className={styles.muted}>Your profile details are complete.</p>}
          {p.missing.length > 3 ? <Link href="/profile?view=completeness" className={styles.textLink}>{p.missing.length - 3} more details to review<ArrowRightIcon aria-hidden="true" /></Link> : null}
          <Link href="/profile?view=readiness" className={styles.dividedLink}>Gulf preparation<span>{p.gulf ? `${p.gulf.finalScore}/100` : 'Review'}<ChevronRightIcon aria-hidden="true" /></span></Link>
        </>}
      </section>
      <section className={styles.card} aria-labelledby="dashboard-activity" aria-busy={p.overviewLoading}>
        <div className={styles.heading}><h2 id="dashboard-activity">Your activity</h2><Link href="/dashboard/library" className={styles.textLink} aria-label="View saved work"><ChevronRightIcon aria-hidden="true" /></Link></div>
        {p.overviewError ? <div role="alert" className={styles.notice}>Saved totals unavailable. <button type="button" onClick={p.onRetryOverview}>Try again</button></div> : null}
        <div className={styles.activity}>{work.map(({label, href: destination, count, Icon}) => <Link href={destination} key={destination} className={styles.activityItem}><Icon aria-hidden="true" /><strong className="type-stat">{p.overviewLoading || p.overviewError || count === undefined ? '—' : count}</strong><span>{label}</span></Link>)}</div>
        {p.overviewLoading ? <p role="status" className={styles.muted}>Loading activity…</p> : <p className={styles.muted}>Saved across your account</p>}
      </section>
    </div>

    <section className={`studio-continue ${styles.continue}`} aria-label="Your next step" aria-busy={!p.ready && !p.error}>
      <div className={styles.continueCopy}><ChatBubbleLeftRightIcon aria-hidden="true" /><div><h2>{p.error ? 'Saved progress unavailable' : !p.ready ? 'Loading your workspace…' : ongoing ? 'Continue your interview' : p.nextAction.title}</h2>{p.ready && ongoing ? <p>{savedInterview?.saved != null ? `${savedInterview.saved} of ${savedInterview.total} answers saved` : 'Saved interview · In progress'}</p> : p.ready && workspace ? <p>{workspace.target_job_title}</p> : null}</div></div>
      {p.ready && savedInterview?.saved != null && savedInterview.total > 0 ? <progress max={savedInterview.total} value={savedInterview.saved} aria-label="Saved interview answers" /> : null}
      {p.error ? <button type="button" onClick={retry} className={buttonVariants({variant:'primary',size:'sm'})}>Try again</button> : p.ready ? <Link href={href} className={buttonVariants({variant:'primary',size:'sm'})}>{ongoing ? 'Continue practice' : p.nextAction.cta}<ArrowRightIcon aria-hidden="true" className="size-4" /></Link> : null}
      {p.ready && !ongoing && p.nextAction.state === 'no_profile' ? <div className={styles.inlineLinks}><Link href="/profile?import=paste">Paste resume</Link><Link href="/profile?view=details">Enter details</Link></div> : null}
    </section>
    {!p.overviewError && (p.overview?.mock_in_progress_count ?? 0) > 0 && !ongoing ? <Link href="/mock-interview" className={styles.textLink}>{p.overview!.mock_in_progress_count} saved interviews in progress<ArrowRightIcon aria-hidden="true" /></Link> : null}

    <div className={styles.pair}>
      <section className={styles.card} aria-label="My interview performance"><InterviewProgressOverview compact /></section>
      <section className={styles.card} aria-labelledby="dashboard-actions"><div className={styles.heading}><h2 id="dashboard-actions">Quick actions</h2></div><div className={styles.actions}>{actions.map(({label, detail, href: destination, Icon}, index) => <Link className={`${styles.quickAction} ${index === 0 ? styles.primaryAction : ''}`} href={destination} key={label}><Icon aria-hidden="true" /><strong>{label}</strong><span>{detail}</span></Link>)}</div></section>
    </div>

    <section className={styles.card} aria-labelledby="dashboard-events" aria-busy={!p.packagesLoaded}>
      <div className={styles.heading}><h2 id="dashboard-events">Upcoming events</h2><Link href="/dashboard/library" className={styles.textLink}>Tracker<ChevronRightIcon aria-hidden="true" /></Link></div>
      <p className={styles.muted}>Interview times use your device’s time zone.</p>
      {!p.packagesLoaded ? <p role="status" className={styles.empty}>Loading saved dates…</p> : p.packagesError ? <div role="alert" className={styles.notice}>Tracker dates unavailable. <button type="button" onClick={retry}>Try again</button></div> : reminders.length ? <ul className={styles.events}>{reminders.slice(0, 3).map(item => <li key={item.id}>
        <div className={styles.eventDate}><span>{new Intl.DateTimeFormat(undefined, {day:'numeric'}).format(item.date)}</span><span>{new Intl.DateTimeFormat(undefined, {month:'short'}).format(item.date)}</span></div>
        <div className={styles.eventCopy}><strong>{item.kind === 'interview' ? 'Interview' : 'Application deadline'}</strong><Link href={`/package/${encodeURIComponent(item.pkg.id)}?tab=tracker`}>{item.pkg.target_job_title}{item.pkg.target_company ? ` · ${item.pkg.target_company}` : ''}</Link><span className={styles.muted}><time dateTime={item.kind === 'deadline' ? item.pkg.application_deadline! : item.pkg.interview_date!}>{formatTrackerDate(item.kind === 'deadline' ? item.pkg.application_deadline! : item.pkg.interview_date!, item.kind === 'interview')}</time> · {reminderTiming(item)}</span></div>
        <Link className={styles.eventAction} href={item.kind === 'interview' && item.pkg.has_resume && !item.earlierToday ? `/mock-interview?package=${encodeURIComponent(item.pkg.id)}` : `/package/${encodeURIComponent(item.pkg.id)}?tab=tracker`}>{item.kind === 'interview' && item.pkg.has_resume && !item.earlierToday ? 'Prepare' : 'Review'}<ArrowTopRightOnSquareIcon aria-hidden="true" /></Link>
      </li>)}</ul> : <div className={styles.empty}><CalendarDaysIcon aria-hidden="true" /><p>No upcoming events saved.</p><Link href="/dashboard/library" className={styles.textLink}>Add dates in your job tracker<ArrowRightIcon aria-hidden="true" /></Link></div>}
      {reminders.length > 3 ? <Link href="/dashboard/library" className={styles.textLink}>View all {reminders.length} saved dates<ArrowRightIcon aria-hidden="true" /></Link> : null}
    </section>

    <div className={styles.pair}>
      <section className={styles.card} aria-labelledby="dashboard-pipeline" aria-busy={p.overviewLoading}>
        <div className={styles.heading}><h2 id="dashboard-pipeline">Application pipeline</h2><Link className={styles.textLink} href="/dashboard/library" aria-label="Manage applications"><ChevronRightIcon aria-hidden="true" /></Link></div>
        {p.overviewError ? <div role="alert" className={styles.notice}>Application counts unavailable. <button type="button" onClick={p.onRetryOverview}>Try again</button></div> : null}
        <dl className={styles.pipeline}>{stages.map(stage => <div key={stage.key}><dt>{stage.label}</dt><dd className="type-stat">{p.overviewLoading || p.overviewError || p.overview?.stages?.[stage.key] === undefined ? '—' : p.overview.stages[stage.key]}</dd></div>)}</dl>
        <p className={styles.muted}>Current saved stages · Manage applications in your Resume Library.</p>
      </section>
      <section className={styles.card} aria-labelledby="dashboard-documents" aria-busy={!p.profileLoaded}>
        <div className={styles.heading}><h2 id="dashboard-documents">Documents & availability</h2><Link href="/profile?view=details" className={styles.textLink} aria-label="Update documents and availability"><ChevronRightIcon aria-hidden="true" /></Link></div>
        <dl className={styles.documents}>{[
          { label: 'Passport validity', value: p.profile?.passport_validity_date ? formatTrackerDate(p.profile.passport_validity_date) : null },
          { label: 'Visa / Iqama status', value: p.profile?.visa_status },
          { label: 'Notice period', value: p.profile?.notice_period },
        ].map(item => <div key={item.label}><dt>{item.label}</dt><dd>{!p.profileLoaded ? 'Loading…' : p.profileError ? 'Unavailable' : item.value || 'Add in Career Profile'}</dd></div>)}</dl>
      </section>
    </div>
    <div className={styles.help}><HowItWorks /></div>
  </main>
}
