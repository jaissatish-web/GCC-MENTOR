'use client'

import { CTA, NAMES } from '@/lib/serviceLabels'

import Link from 'next/link'
import { FirstResumeDialog } from '@/components/dashboard/FirstResumeDialog'
import { shouldOfferFirstResume } from '@/lib/firstResumeOnboarding'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowRightIcon, ChevronRightIcon, ChatBubbleLeftRightIcon, DocumentTextIcon, EnvelopeIcon, QuestionMarkCircleIcon, SparklesIcon, PencilSquareIcon, CalendarDaysIcon, ArrowTopRightOnSquareIcon, MapPinIcon, GlobeAltIcon, IdentificationIcon } from '@heroicons/react/24/outline'
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
  pendingDraftAbsent?: boolean
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
    { label: NAMES.interviewQa, href: '/interview-qa', count: p.overview?.qa_set_count, Icon: QuestionMarkCircleIcon },
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
    { label: CTA.addTargetJob, detail: 'Use your saved Career Profile', href: '/optimize/target', Icon: SparklesIcon },
    { label: NAMES.library, detail: 'Open your saved resumes', href: '/dashboard/library', Icon: DocumentTextIcon },
    { label: 'Edit Career Profile', detail: 'Keep your details current', href: '/profile?view=details', Icon: PencilSquareIcon },
    { label: 'Start interview practice', detail: 'Practise for your next role', href: '/mock-interview', Icon: ChatBubbleLeftRightIcon },
  ]
  const offerFirstResume = shouldOfferFirstResume({pendingDraftAbsent:p.pendingDraftAbsent === true,ready:p.ready,error:p.error,profileExists:Boolean(p.profile),profileLoaded:p.profileLoaded,profileError:p.profileError,packagesLoaded:p.packagesLoaded,packagesError:p.packagesError,packageCount:p.packages.length,overviewLoading:p.overviewLoading,overviewError:p.overviewError,resumeCount:p.overview?.resume_count,nextActionState:p.nextAction.state})
  return <main className={`studio-page studio-home ${styles.dashboard}`} aria-label="Career dashboard">
    <FirstResumeDialog eligible={offerFirstResume} />
    <header className={styles.profile} aria-busy={!p.profileLoaded} data-dashboard-section="profile">
      <div className={styles.avatar}>{available && p.profile?.photo_url ? <Image src={p.profile.photo_url} width={56} height={56} unoptimized alt="" /> : <span aria-hidden="true">{p.profileLoaded && !p.profileError ? initials : '—'}</span>}</div>
      <div className={styles.identity}>
        <h1>{!p.profileLoaded ? 'Loading your profile…' : p.profileError ? 'Your Career Profile' : p.profile?.full_name || 'Welcome to GCC Mentor'}</h1>
        {available ? <p className={`type-helper ${styles.role}`}>{p.profile?.target_job_title || latestRole || 'Your Career Profile'}</p> : null}
        {available && p.profile?.current_location ? <p className={`type-caption ${styles.location}`}><MapPinIcon aria-hidden="true" />{p.profile.current_location}</p> : null}
        {p.profileError ? <button type="button" onClick={retry} className={styles.textLink}>Profile unavailable · Try again</button> : p.profileLoaded && !p.profile ? <Link className={styles.textLink} href="/profile?view=details">Create Career Profile<ArrowRightIcon aria-hidden="true" /></Link> : null}
      </div>
      <Link className={styles.profileLink} href={available ? '/profile' : '/profile?view=details'} aria-label={available ? 'View Career Profile' : 'Create Career Profile'}><ChevronRightIcon aria-hidden="true" /></Link>
    </header>

    <section className={styles.readiness} aria-label="Readiness overview" aria-busy={!p.profileLoaded} data-dashboard-section="readiness">
      <Link href="/profile?view=completeness" className={styles.readinessItem}>
        <span className={styles.readinessLabel}><IdentificationIcon aria-hidden="true" /><span className="type-label">Profile completeness</span><ChevronRightIcon aria-hidden="true" /></span>
        <span className={styles.scoreLine}><strong className="type-stat">{available ? p.score : '—'}<span className={`type-caption ${styles.muted}`}> /100</span></strong></span>
        <progress className={styles.readinessBar} data-level={p.score < 50 ? 'low' : p.score < 70 ? 'medium' : 'high'} max={100} value={available ? p.score : undefined} aria-label="Profile completeness" aria-valuetext={available ? undefined : 'Unavailable'} />
      </Link>
      <Link href="/profile?view=readiness" className={`${styles.readinessItem} ${styles.gulf}`}>
        <span className={styles.readinessLabel}><GlobeAltIcon aria-hidden="true" /><span className="type-label">Gulf preparation</span><ChevronRightIcon aria-hidden="true" /></span>
        <span className={styles.scoreLine}><strong className="type-stat">{available && p.gulf ? p.gulf.finalScore : '—'}<span className={`type-caption ${styles.muted}`}> /100</span></strong></span>
        <progress className={styles.readinessBar} max={100} value={available && p.gulf ? p.gulf.finalScore : undefined} aria-label="Gulf preparation" aria-valuetext={available && p.gulf ? undefined : 'Unavailable'} />
      </Link>
      {p.profileError ? <button type="button" onClick={retry} className={styles.readinessRetry}>Readiness unavailable · Try again</button> : null}
    </section>

    <section className={`studio-continue ${styles.continue}`} aria-label="Your next step" aria-busy={!p.ready && !p.error} data-dashboard-section="next-action">
      <div className={styles.continueCopy}>
        <span className={styles.actionIcon}><ArrowRightIcon aria-hidden="true" /></span>
        <div><h2>Continue your journey</h2><p className={`type-card ${styles.actionTitle}`}>{p.error ? 'Saved progress unavailable' : !p.ready ? 'Loading your workspace…' : ongoing ? 'Continue your interview' : p.nextAction.title}</p>{p.ready && ongoing ? <p className="type-helper">{savedInterview?.saved != null ? `${savedInterview.saved} of ${savedInterview.total} answers saved` : 'Saved interview · In progress'}</p> : p.ready && workspace ? <p className="type-helper">{workspace.target_job_title}</p> : null}</div>
      </div>
      {p.ready && savedInterview?.saved != null && savedInterview.total > 0 ? <progress max={savedInterview.total} value={savedInterview.saved} aria-label="Saved interview answers" /> : null}
      {p.error ? <button type="button" onClick={retry} className={buttonVariants({variant:'primary',size:'sm'})}>Try again</button> : p.ready ? <Link href={href} className={buttonVariants({variant:'primary',size:'sm'})}>{ongoing ? 'Continue practice' : p.nextAction.cta}<ArrowRightIcon aria-hidden="true" /></Link> : null}
      {p.ready && !ongoing && p.nextAction.state === 'no_profile' ? <div className={styles.inlineLinks}><Link href="/profile?import=paste">Paste resume</Link><Link href="/profile?view=details">Enter details</Link></div> : null}
      {!p.overviewError && (p.overview?.mock_in_progress_count ?? 0) > 0 && !ongoing ? <Link href="/mock-interview" className={styles.textLink}>{p.overview!.mock_in_progress_count} saved interviews in progress<ArrowRightIcon aria-hidden="true" /></Link> : null}
    </section>

    <section className={`${styles.card} ${styles.activityCard}`} aria-labelledby="dashboard-activity" aria-busy={p.overviewLoading} data-dashboard-section="activity">
      <div className={styles.heading}><div><h2 id="dashboard-activity">Your activity</h2><p className="type-caption">Saved across your account</p></div><Link href="/dashboard/library" className={styles.iconLink} aria-label="View saved work"><ChevronRightIcon aria-hidden="true" /></Link></div>
      {p.overviewError ? <div role="alert" className={styles.notice}>Saved totals unavailable. <button type="button" onClick={p.onRetryOverview}>Try again</button></div> : null}
      <div className={styles.activity}>{work.map(({label, href: destination, count, Icon}, index) => <Link href={destination} key={destination} className={styles.activityItem} data-tone={index}><span className={styles.serviceIcon}><Icon aria-hidden="true" /></span><strong className="type-stat">{p.overviewLoading || p.overviewError || count === undefined ? '—' : count}</strong><span className={`type-helper ${styles.activityLabel}`}>{label}</span></Link>)}</div>
      {p.overviewLoading ? <p role="status" className={`type-helper ${styles.muted}`}>Loading activity…</p> : null}
    </section>

    <section className={`${styles.card} ${styles.quickActionsCard}`} aria-labelledby="dashboard-actions" data-dashboard-section="quick-actions">
      <div className={styles.heading}><h2 id="dashboard-actions">Quick actions</h2><span className={`type-caption ${styles.muted}`}>Your tools</span></div>
      <div className={styles.actions}>{actions.map(({label, href: destination, Icon}) => <Link className={styles.quickAction} href={destination} key={label}><span className={styles.serviceIcon}><Icon aria-hidden="true" /></span><span className="type-button">{label}</span></Link>)}</div>
    </section>

    <section className={`${styles.card} ${styles.performanceCard}`} aria-label="My interview performance" data-dashboard-section="interview"><InterviewProgressOverview compact /></section>

    <section className={`${styles.card} ${styles.eventsCard}`} aria-labelledby="dashboard-events" aria-busy={!p.packagesLoaded} data-dashboard-section="events">
      <div className={styles.heading}><h2 id="dashboard-events">Upcoming events</h2><Link href="/dashboard/library" className={styles.textLink}>Tracker<ChevronRightIcon aria-hidden="true" /></Link></div>
      {!p.packagesLoaded ? <p role="status" className={styles.empty}>Loading saved dates…</p> : p.packagesError ? <div role="alert" className={styles.notice}>Tracker dates unavailable. <button type="button" onClick={retry}>Try again</button></div> : reminders.length ? <>
        <ul className={styles.events}>{reminders.slice(0, 3).map(item => <li key={item.id}>
          <div className={styles.eventDate} aria-hidden="true"><span>{new Intl.DateTimeFormat(undefined, {day:'numeric'}).format(item.date)}</span><span>{new Intl.DateTimeFormat(undefined, {month:'short'}).format(item.date)}</span></div>
          <div className={styles.eventCopy}><strong className="type-label">{item.kind === 'interview' ? 'Interview' : 'Application deadline'}</strong><Link href={`/package/${encodeURIComponent(item.pkg.id)}?tab=tracker`}>{item.pkg.target_job_title}</Link>{item.pkg.target_company ? <span className={`type-helper ${styles.muted}`}>{item.pkg.target_company}</span> : null}<span className={`type-caption ${styles.muted}`}><time dateTime={item.kind === 'deadline' ? item.pkg.application_deadline! : item.pkg.interview_date!}>{formatTrackerDate(item.kind === 'deadline' ? item.pkg.application_deadline! : item.pkg.interview_date!, item.kind === 'interview')}</time> · {reminderTiming(item)}</span></div>
          <Link className={styles.eventAction} href={item.kind === 'interview' && item.pkg.has_resume && !item.earlierToday ? `/mock-interview?package=${encodeURIComponent(item.pkg.id)}` : `/package/${encodeURIComponent(item.pkg.id)}?tab=tracker`}>{item.kind === 'interview' && item.pkg.has_resume && !item.earlierToday ? 'Prepare' : 'Review'}<ArrowTopRightOnSquareIcon aria-hidden="true" /></Link>
        </li>)}</ul>
        <p className={`type-caption ${styles.muted}`}>Interview times use your device’s time zone.</p>
      </> : <div className={styles.emptyRow}><CalendarDaysIcon aria-hidden="true" /><div><p className="type-helper">No upcoming events saved.</p><Link href="/dashboard/library" className={styles.textLink}>Add dates in your job tracker<ArrowRightIcon aria-hidden="true" /></Link></div></div>}
      {reminders.length > 3 ? <Link href="/dashboard/library" className={styles.textLink}>View all {reminders.length} saved dates<ArrowRightIcon aria-hidden="true" /></Link> : null}
    </section>

    <section className={`${styles.card} ${styles.pipelineCard}`} aria-labelledby="dashboard-pipeline" aria-busy={p.overviewLoading} data-dashboard-section="pipeline">
      <div className={styles.heading}><h2 id="dashboard-pipeline">Application pipeline</h2><Link className={styles.iconLink} href="/dashboard/library" aria-label="Manage applications"><ChevronRightIcon aria-hidden="true" /></Link></div>
      {p.overviewError ? <div role="alert" className={styles.notice}>Application counts unavailable. <button type="button" onClick={p.onRetryOverview}>Try again</button></div> : null}
      <dl className={styles.pipeline}>{stages.map(stage => <div key={stage.key} data-stage={stage.key}><dt className="type-helper">{stage.label}</dt><dd className="type-stat">{p.overviewLoading || p.overviewError || p.overview?.stages?.[stage.key] === undefined ? '—' : p.overview.stages[stage.key]}</dd></div>)}</dl>
      <Link href="/dashboard/library" className={styles.textLink}>Manage applications<ArrowRightIcon aria-hidden="true" /></Link>
    </section>

    <section className={`${styles.card} ${styles.documentsCard}`} aria-labelledby="dashboard-documents" aria-busy={!p.profileLoaded} data-dashboard-section="documents">
      <div className={styles.heading}><h2 id="dashboard-documents">Documents & availability</h2><Link href="/profile?view=details" className={styles.iconLink} aria-label="Update documents and availability"><PencilSquareIcon aria-hidden="true" /></Link></div>
      <dl className={styles.documents}>{[
        { label: 'Passport validity', value: p.profile?.passport_validity_date ? formatTrackerDate(p.profile.passport_validity_date) : null },
        { label: 'Visa / Iqama status', value: p.profile?.visa_status },
        { label: 'Notice period', value: p.profile?.notice_period },
      ].map(item => <div key={item.label}><dt className="type-helper">{item.label}</dt><dd className="type-helper">{!p.profileLoaded ? 'Loading…' : p.profileError ? 'Unavailable' : item.value || 'Not added'}</dd></div>)}</dl>
    </section>
    <div className={styles.help} data-dashboard-section="guide"><HowItWorks /></div>
  </main>
}
