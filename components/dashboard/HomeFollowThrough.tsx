'use client'

import Link from 'next/link'
import { ArrowRightIcon, CalendarDaysIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
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
  // A previous completed report must not hide a newer unfinished interview.
  const ongoing = action.state === 'add_next_job' ? [...packages].filter(pkg => pkg.mock_in_progress).sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at))[0] : null
  if (ongoing) action = { ...action, state: 'job_needs_mock', href: `/mock-interview?package=${encodeURIComponent(ongoing.id)}`, cta: 'Continue interview' }
  const copy = GUIDANCE[action.state]
  const workspace = nextActionWorkspace(action, packages)
  const resumeInterview = action.state === 'job_needs_mock' && workspace?.mock_in_progress
  const steps = workspace ? [
    { label: 'Resume', done: cvReady(workspace) },
    { label: 'Cover letter', done: workspace.cover_letter_count > 0 },
    { label: 'Q&A', done: workspace.qa_question_count > 0 },
    { label: 'Mock interview', done: Boolean(workspace.mock_completed_run_id), inProgress: workspace.mock_in_progress },
  ] : []
  return <section aria-label="Your next step" className={styles.followThrough} aria-busy={!ready && !error}>
    <span className={styles.nextEyebrow}>{error || !ready ? 'Your next step' : copy.label}</span>
    <h2>{error ? 'Your saved progress could not be loaded' : !ready ? 'Checking your saved progress…' : resumeInterview ? 'Continue your unfinished interview' : copy.title}</h2>
    <p>{error ? 'Try again to see where to continue.' : !ready ? 'Finding the next action from your saved profile and workspaces.' : resumeInterview ? 'An interview is already in progress in this workspace. Reopen it and continue your saved attempt.' : copy.body}</p>
    {ready && !error && workspace ? <div className={styles.resumeContext}>
      <span className={styles.nextEyebrow}>Saved workspace</span><p className={styles.workspaceName}>{workspace.name || workspace.target_job_title}</p>
      <p>{[workspace.target_job_title, workspace.target_company].filter(Boolean).join(' · ')}</p>
      <ul aria-label="Saved preparation status" className={styles.preparationStatus}>{steps.map(step => <li key={step.label}>{step.done && !step.inProgress ? <CheckCircleIcon aria-hidden="true" className="size-4 shrink-0" /> : <ClockIcon aria-hidden="true" className="size-4 shrink-0" />}<span>{step.label}: {step.inProgress ? 'In progress' : step.done ? 'Ready' : 'To prepare'}</span></li>)}</ul>
    </div> : null}
    <div className={styles.continueActions}>
      {error ? <button type="button" className={buttonVariants({ variant: 'secondary' })} onClick={onRetry}>Try again</button> : ready ? <Link href={action.href} className={buttonVariants({ variant: 'secondary' })}>{action.state === 'no_profile' ? 'Create Career Profile' : resumeInterview ? 'Continue interview' : action.cta}<ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" /></Link> : null}
      {ready && !error && workspace ? <Link href={`/package/${encodeURIComponent(workspace.id)}`} className={styles.contextLink}>Open workspace</Link> : null}
    </div>
  </section>
}

export function HomeUpcomingDates({ packages, loading, error, onRetry, now }: {
  packages: PackageSummary[]; loading: boolean; error: boolean; onRetry: () => void; now?: Date
}) {
  const reminders = homeReminders(packages, now)
  return <section className={styles.datesPanel} aria-labelledby="home-dates-heading" aria-busy={loading}>
    <div className={styles.datesHeading}><CalendarDaysIcon aria-hidden="true" className="size-5 shrink-0 text-teal" /><h2 id="home-dates-heading">Deadlines & interview reminders</h2></div>
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
  </section>
}

/** Surface near-term dates before the long profile card, with details further down Home. */
export function HomeDateNotice({ packages, ready, now }: { packages: PackageSummary[]; ready: boolean; now?: Date }) {
  if (!ready) return null
  const dates = homeReminders(packages, now).filter(item => item.days <= 7)
  const first = dates[0]
  if (!first) return null
  return <a href="#home-dates-heading" className={styles.dateNotice}>
    <CalendarDaysIcon aria-hidden="true" className="size-5 shrink-0" />
    <span><strong>{first.kind === 'interview' ? 'Interview' : 'Application deadline'} · {reminderTiming(first)}</strong><span>{first.pkg.target_job_title}{dates.length > 1 ? ` · ${dates.length - 1} more date${dates.length > 2 ? 's' : ''}` : ''}</span><span className={styles.noticeCta}>View reminders</span></span>
    <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" />
  </a>
}
