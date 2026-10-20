'use client'

import { NAMES } from '@/lib/serviceLabels'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadHomeInterview, unfinishedInterviewWorkspace, type HomeInterview } from '@/lib/homeInterview'
import { ArrowRightIcon, CalendarDaysIcon, ClockIcon, MicrophoneIcon, CheckCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { buttonVariants } from '@/components/ui/Button'
import { cvReady, type PackageSummary } from '@/lib/packageSummary'
import type { NextAction } from '@/lib/nextAction'
import { homeReminders, nextActionWorkspace, reminderTiming } from '@/lib/homeFollowThrough'
import styles from './career-home.module.css'

const GUIDANCE: Record<NextAction['state'], { label: string; title: string; body: string }> = {
  no_profile: { label: 'Start here · Step 1', title: 'Create your Career Profile', body: 'Add your career details once. Then use them to optimize a resume and prepare for each job.' },
  draft_waiting: { label: 'Continue your saved import', title: 'Review the resume you uploaded', body: 'Your imported details are waiting. Review them and save your Career Profile to continue.' },
  profile_thin: { label: 'Continue your Career Profile', title: 'Add the missing career details', body: 'Your details are saved. Complete the missing information so each new resume has a stronger foundation.' },
  no_target_job: { label: 'Start your first job workspace · Step 2', title: 'Add the job you want to apply for', body: 'Your Career Profile is saved. Add a job title and, if available, its job description to optimize your first job-specific resume.' },
  job_unpaid: { label: 'Continue saved preparation', title: 'Finish the resume you started', body: 'Your job details are saved. Continue the setup for this workspace.' },
  job_not_generated: { label: 'Continue saved preparation', title: 'Finish your resume optimization', body: 'This workspace is ready to build. Continue to prepare its optimized resume.' },
  job_needs_letter: { label: 'Continue saved preparation · Step 3', title: 'Your resume is ready. Prepare its cover letter.', body: 'Use the same resume and job details to explain your fit in a cover letter.' },
  job_needs_qa: { label: 'Continue saved preparation · Step 3', title: 'Prepare answers for this job', body: 'Your resume and cover letter are saved. Prepare interview questions and suggested answers next.' },
  job_needs_mock: { label: 'Continue saved preparation · Step 3', title: 'Practise the interview for this workspace', body: 'Your resume, cover letter and Q&A are saved. Practise your answers and review your feedback.' },
  add_next_job: { label: 'Ready for your next opportunity', title: 'Prepare for another job', body: 'Your saved workspaces are ready. Reuse your Career Profile to create a resume for your next job opening.' },
}

export function HomeNextStep({ action, packages, ready, error, onRetry }: {
  action: NextAction; packages: PackageSummary[]; ready: boolean; error: boolean; onRetry: () => void
}) {
  const suggestedAction = action
  const suggestedWorkspace = nextActionWorkspace(suggestedAction, packages)
  const ongoing = !['no_profile', 'draft_waiting'].includes(action.state) ? unfinishedInterviewWorkspace(packages) : null
  const ongoingId = ready && !error ? ongoing?.id : undefined
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
  if (ongoing) action = { ...action, state: 'job_needs_mock', href: savedInterview?.href ?? `/mock-interview?package=${encodeURIComponent(ongoing.id)}`, cta: 'Continue interview' }
  const copy = GUIDANCE[action.state]
  const mobileCopy = action.state === 'no_target_job' ? { title: 'Match your next opportunity', body: 'Add a job to prepare a tailored resume.' } : copy
  const workspace = ongoing ?? nextActionWorkspace(action, packages)
  const resumeInterview = Boolean(ongoing)
  const secondary = resumeInterview && ['job_needs_letter', 'job_needs_qa', 'job_not_generated', 'job_unpaid'].includes(suggestedAction.state)
  const progress = savedInterview?.saved != null
    ? `${savedInterview.saved} of ${savedInterview.total} answers saved. Continue where you left off.`
    : 'Your saved interview is ready to continue.'
  const steps = workspace ? [
    { label: NAMES.resume, done: cvReady(workspace) },
    { label: NAMES.coverLetter, done: workspace.cover_letter_count > 0 },
    { label: NAMES.interviewQa, done: workspace.qa_question_count > 0 },
    { label: NAMES.mockInterview, done: Boolean(workspace.mock_completed_run_id), inProgress: workspace.mock_in_progress },
  ] : []
  return <>
    {ready && !error && ongoing ? <div className={styles.mobileFollowThrough}>
      {suggestedAction.state !== 'job_needs_mock' ? <section className={styles.mobileNext} aria-label="Recommended next step">
        <span className={styles.nextEyebrow}>Your next step</span><h2>{GUIDANCE[suggestedAction.state].title}</h2>
        <p className={styles.nextDescription}>{GUIDANCE[suggestedAction.state].body}</p>
        <Link href={suggestedAction.href} className={buttonVariants({ variant: 'primary' })}>{suggestedAction.cta}<ArrowRightIcon aria-hidden="true" className="size-4" /></Link>
      </section> : null}
      <section className={styles.mobileContinue} aria-label="Continue your practice">
        <h2>Continue your practice</h2>
        <div className={styles.continueIdentity}><span className={styles.practiceIcon}><MicrophoneIcon className="size-6" aria-hidden="true" /></span><div><h3>{workspace?.target_job_title || 'Mock interview'}</h3><p>{savedInterview?.saved != null ? `${savedInterview.saved} of ${savedInterview.total} answers saved · In progress` : 'Saved interview · In progress'}</p></div></div>
        <Link href={action.href} className={buttonVariants({ variant: 'secondary' })}>Continue interview<ArrowRightIcon aria-hidden="true" className="size-4" /></Link>
        <details className={styles.preparationDetails}><summary>Preparation details<ChevronDownIcon className="size-4" aria-hidden="true" /></summary><ul className={styles.preparationStatus}>{steps.map(step => <li key={step.label}><CheckCircleIcon className="size-4 shrink-0" aria-hidden="true" />{step.label}: {step.inProgress ? 'In progress' : step.done ? 'Ready' : 'To prepare'}</li>)}</ul>{workspace ? <Link href={`/package/${encodeURIComponent(workspace.id)}`} className={styles.action}>Open job workspace<ArrowRightIcon className="size-4" aria-hidden="true" /></Link> : null}</details>
      </section>
    </div> : null}
    <section aria-label="Your next step" className={`${styles.followThrough} ${ready && !error && ongoing ? styles.desktopFollowThrough : ''}`} aria-busy={!ready && !error}>
    <span className={styles.nextEyebrow}>{ready && !error && workspace ? resumeInterview ? 'Continue your interview' : 'Continue your preparation' : 'Your next step'}</span>
    {!ready || error || !workspace ? <h2>{error ? 'Your saved progress could not be loaded' : !ready ? 'Checking your saved progress…' : resumeInterview ? 'Continue your interview' : <><span className="md:hidden">{mobileCopy.title}</span><span className="hidden md:inline">{copy.title}</span></>}</h2> : null}
    {ready && !error && workspace ? <div className={styles.resumeContext}>
      <h2><Link href={`/package/${encodeURIComponent(workspace.id)}`} aria-label={`Open workspace · ${workspace.target_job_title}`} className={styles.workspaceName}>{[workspace.target_job_title, workspace.target_company].filter(Boolean).join(' · ')}<ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" /></Link></h2>
      {workspace.name && workspace.name !== workspace.target_job_title ? <p className={styles.workspaceLabel}>{workspace.name}</p> : null}
    </div> : null}
    {!ready || error || !workspace ? <p className={styles.nextDescription}>{error ? 'Try again to see where to continue.' : !ready ? 'Finding the next action from your saved profile and workspaces.' : <><span className="md:hidden">{mobileCopy.body}</span><span className="hidden md:inline">{copy.body}</span></>}</p> : null}
    <div className={styles.continueActions}>
      {error ? <button type="button" className={buttonVariants({ variant: 'primary' })} onClick={onRetry}>Try again</button> : ready ? <Link href={action.href} className={buttonVariants({ variant: 'primary' })}>{action.state === 'no_profile' ? 'Create Career Profile' : resumeInterview ? 'Continue interview' : action.cta}<ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" /></Link> : null}
    </div>
    {ready && !error && secondary ? <div className={styles.secondarySuggestion}>
      <span>Next suggested step{suggestedWorkspace && suggestedWorkspace.id !== workspace?.id ? ` · ${suggestedWorkspace.target_job_title}` : ''}</span>
      <Link href={suggestedAction.href} className={styles.contextLink}>{suggestedAction.cta}<ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" /></Link>
    </div> : null}
    {ready && !error && workspace ? <details className={styles.preparationDetails}><summary>Preparation details<ChevronDownIcon aria-hidden="true" className={styles.disclosureChevron} /></summary><p className={styles.nextDescription}>{resumeInterview ? progress : `${copy.title} ${copy.body}`}</p><ul aria-label="Saved preparation status" className={styles.preparationStatus}>{steps.map(step => <li key={step.label}>{step.done && !step.inProgress ? <CheckCircleIcon aria-hidden="true" className="size-4 shrink-0" /> : <ClockIcon aria-hidden="true" className="size-4 shrink-0" />}<span>{step.label}: {step.inProgress ? 'In progress' : step.done ? 'Ready' : 'To prepare'}</span></li>)}</ul></details> : ready && !error ? <p className={styles.nextContext}>{copy.label}</p> : null}
  </section></>
}

export function HomeUpcomingDates({ packages, loading, error, onRetry, now }: {
  packages: PackageSummary[]; loading: boolean; error: boolean; onRetry: () => void; now?: Date
}) {
  const reminders = homeReminders(packages, now)
  const first = reminders[0]
  const summary = loading ? 'Checking your saved dates…' : error ? 'Tracker dates could not be loaded' : first ? `${reminders.length} reminder${reminders.length === 1 ? '' : 's'} · ${first.kind === 'interview' ? 'Interview' : 'Deadline'}: ${reminderTiming(first)}` : 'No upcoming dates · Add dates in your tracker'
  return <details id="home-reminders" className={styles.datesPanel} aria-labelledby="home-dates-heading" aria-busy={loading}>
    <summary className={styles.datesSummary}><h2 id="home-dates-heading"><CalendarDaysIcon aria-hidden="true" className="size-5 shrink-0" /><span>Deadlines & interview reminders<small>{summary}</small></span><ChevronDownIcon aria-hidden="true" className={styles.disclosureChevron} /></h2></summary>
    <div id="home-reminder-list" className={styles.datesBody}>
    <p className={styles.datesIntro}>Upcoming dates and deadlines missed in the past 7 days, from your trackers. Interview times use your device’s time zone.</p>
    {loading ? <p role="status">Checking your saved dates…</p> : error ? <div role="alert"><p>Tracker dates could not be loaded.</p><button type="button" className={styles.action} onClick={onRetry}>Try again</button></div> : reminders.length ? <>
      <ul className={styles.dateList}>{reminders.slice(0, 6).map(item => <li key={item.id}>
        <div className={styles.dateMeta}><span>{item.kind === 'interview' ? 'Interview' : 'Application deadline'}</span><span className={item.days <= 1 ? styles.urgentDate : styles.futureDate}>{reminderTiming(item)}</span></div>
        <Link className={styles.dateJob} href={`/package/${encodeURIComponent(item.pkg.id)}?tab=tracker`}>{item.pkg.target_job_title}<ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" /></Link>
        {item.pkg.target_company ? <p className={styles.company}>{item.pkg.target_company}</p> : null}
        <p className={styles.dateValue}><ClockIcon aria-hidden="true" className="size-4 shrink-0" /><time dateTime={item.kind === 'deadline' ? item.pkg.application_deadline! : item.pkg.interview_date!}>{new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', ...(item.kind === 'interview' ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(item.date)}</time></p>
        {item.pkg.application_notes?.trim() ? <p className={styles.trackerNote}>Tracker note: {item.pkg.application_notes}</p> : null}
        {item.kind === 'interview' && item.pkg.has_resume && !item.earlierToday ? <Link className={styles.action} href={`/mock-interview?package=${encodeURIComponent(item.pkg.id)}`}>Prepare for interview <ArrowRightIcon aria-hidden="true" className="size-4" /></Link> : <Link className={styles.action} href={`/package/${encodeURIComponent(item.pkg.id)}?tab=tracker`}>{item.days < 0 || item.earlierToday ? 'Review tracker' : 'Open tracker'}</Link>}
      </li>)}</ul>
      {reminders.length > 6 ? <p className={styles.datesIntro}>Showing the next 6 of {reminders.length} saved dates.</p> : null}
    </> : <p className={styles.emptyDates}>No upcoming dates saved. Add application deadlines and interview dates in each workspace’s Tracker tab to see them here.</p>}
    <Link href="/dashboard/library" className={styles.action}>Open Resume Library <ArrowRightIcon aria-hidden="true" className="size-4" /></Link>
    </div>
  </details>
}

/** Surface near-term dates below Career Profile, with full details further down Home. */
export function HomeDateNotice({ packages, ready, now }: { packages: PackageSummary[]; ready: boolean; now?: Date }) {
  if (!ready) return null
  const dates = homeReminders(packages, now).filter(item => item.days <= 7)
  const first = dates[0]
  if (!first) return null
  return <a href="#home-reminder-list" className={styles.dateNotice} onClick={() => {
    const panel = document.getElementById('home-reminders')
    if (panel instanceof HTMLDetailsElement) panel.open = true
  }}>
    <span className={styles.noticeIcon}><CalendarDaysIcon aria-hidden="true" className="size-5 shrink-0" /></span>
    <span><strong>{first.kind === 'interview' ? 'Interview' : 'Application deadline'} · {reminderTiming(first)}</strong><span>{first.pkg.target_job_title}{dates.length > 1 ? ` · ${dates.length - 1} more date${dates.length > 2 ? 's' : ''}` : ''}</span><span className="sr-only">View reminders</span></span>
    <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" />
  </a>
}
