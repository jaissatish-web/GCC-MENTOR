'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { ArrowRightIcon, ChevronDownIcon, ChevronRightIcon, Cog6ToothIcon, DocumentTextIcon, EnvelopeIcon, InformationCircleIcon, PencilSquareIcon, UserCircleIcon, RectangleStackIcon, ChatBubbleLeftRightIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { CareerProfileResumeButton } from '@/components/resume/CareerProfileResumeButton'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { GulfReadinessResult } from '@/lib/gulfReadiness/types'
import type { DashboardOverview } from '@/lib/dashboardOverview'
import styles from './career-home.module.css'
import { buttonVariants } from '@/components/ui/Button'

/** Presentation only: retain the same rounding and bounds as the former ring. */
function ReadinessStat({ value, label, percent = false }: { value: number | null; label: string; percent?: boolean }) {
  const display = value === null ? null : Math.max(0, Math.min(100, Math.round(value)))
  return <span className={styles.stat}>
    <span className={styles.number} aria-label={display === null ? `${label}: unavailable` : `${label}: ${display} out of 100`}>{display ?? '—'}{percent ? <span aria-hidden="true">%</span> : <span aria-hidden="true"> / 100</span>}</span>
    <span className={styles.bar} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={display ?? undefined} aria-valuetext={display === null ? 'Unavailable' : `${display} out of 100`}>
      <span className={styles.fill} style={{ width: `${display ?? 0}%`, backgroundSize: `${display ? 10000 / display : 100}% 100%` }} />
    </span>
  </span>
}

export function HomeScores({ profile, score, missing, gulf, loading, error }: {
  profile: CareerProfileFull | null; score: number; missing: number; gulf: GulfReadinessResult | null; loading: boolean; error: boolean
}) {
  const available = !loading && !error && Boolean(profile)
  return <section aria-label="Your readiness scores" aria-busy={loading} className={styles.scores}>
    <Link href="/profile?view=completeness" className={styles.score}>
      <ReadinessStat value={available ? score : null} label="Profile completeness" percent />
      <span className={styles.scoreCopy}>Profile completeness<span className="sr-only"> · {loading ? 'Loading…' : error ? 'Unavailable' : !profile ? 'Get started' : missing ? `${missing} left` : 'Complete'}</span></span>
    </Link>
    <Link href="/profile?view=readiness" className={styles.score}>
      <ReadinessStat value={available && gulf ? gulf.finalScore : null} label="Gulf readiness" />
      <span className={styles.scoreCopy}>Gulf readiness<span className="sr-only"> · {loading ? 'Loading…' : error ? 'Unavailable' : profile ? 'Review' : 'Add profile'}</span></span>
    </Link>
  </section>
}

function ProfileWorkflow() {
  const steps = [
    { Icon: UserCircleIcon, title: 'Career Profile', body: 'Save your real experience, skills and education once.' },
    { Icon: DocumentTextIcon, title: 'Optimized Resume', body: 'Use this profile to create a resume for each job.' },
    { Icon: RectangleStackIcon, title: 'Job Workspace', body: 'Prepare that resume’s cover letter, Q&A and mock interview.' },
  ]
  return <ol className={styles.workflow} aria-label="From one profile to each job workspace">{steps.map(({ Icon, title, body }, i) => <li key={title}>
    <span className={styles.stepIcon}><Icon aria-hidden="true" className="size-5" /></span>
    <div><h3>{i + 1}. {title}</h3><p>{body}</p></div>
  </li>)}</ol>
}

export function HomeProfile({ profile, loading, error, missingLabels = [], score, gulf = null }: {
  profile: CareerProfileFull | null; loading: boolean; error: boolean; missingLabels?: string[]
  score?: number; gulf?: GulfReadinessResult | null
}) {
  const [showDetails, setShowDetails] = useState(false)
  if (loading) return <section aria-label="Loading your Career Profile" aria-busy="true" className={styles.profile}><div className="h-48 animate-pulse rounded-ctl bg-canvas motion-reduce:animate-none" /></section>
  const heading = <div className={styles.foundationHeading}><h2 id="home-profile-heading">Career Profile</h2><p>Your foundation for every job.</p></div>
  if (!profile || error) return <section aria-labelledby="home-profile-heading" className={styles.profile}>
    {!error ? <p className={styles.startLabel}>Start here · Step 1</p> : null}
    {heading}
    <p className={styles.intro}>{error ? 'Your profile could not be loaded. Your saved work has not been changed.' : 'Start with your resume or enter your career details. This profile becomes the source for every new job-specific resume.'}</p>
    {error ? <button type="button" className={styles.action} onClick={() => window.location.reload()}>Try again <ArrowRightIcon aria-hidden="true" className="size-4" /></button> : <div className={styles.foundationActions}><Link className={buttonVariants({ variant: 'primary' })} href="/profile?import=upload">Create Career Profile</Link><div className="flex flex-wrap gap-x-5"><Link className={styles.action} href="/profile?import=paste">Paste resume</Link><Link className={styles.action} href="/profile?view=details">Enter details</Link></div></div>}
    <ProfileWorkflow />
  </section>
  const initials = (profile.full_name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('') || 'Me'
  const profileScore = score ?? profile.readiness_score ?? 0
  return <section aria-labelledby="home-profile-heading" className={styles.profile}>
    <div className={styles.foundationIdentity}>
      <Link href="/profile?view=details" aria-label="Edit your Career Profile" className={styles.avatar}>
        {profile.photo_url ? <Image src={profile.photo_url} alt="" width={96} height={96} unoptimized className="h-full w-full object-cover" /> : <span aria-hidden="true">{initials}</span>}
      </Link>
      <div className={styles.identityCopy}>{heading}<div className={styles.identityText}>{profile.full_name || 'Your saved profile'}</div></div>
      <Link href="/profile?view=details" className={styles.editLink}><PencilSquareIcon aria-hidden="true" className="size-4" /><span>Edit</span></Link>
    </div>
    <details className={styles.foundationMore}><summary>Gulf readiness & profile details<ChevronDownIcon aria-hidden="true" className="size-4"/></summary><HomeScores profile={profile} score={profileScore} missing={missingLabels.length} gulf={gulf} loading={false} error={false} />
    <div className={styles.profileControls}>
      <Link href="/profile?view=completeness" className={styles.action} aria-label={missingLabels.length ? `Complete Career Profile · ${missingLabels.length} ${missingLabels.length === 1 ? 'item' : 'items'} left` : 'Review Career Profile'}><DocumentTextIcon aria-hidden="true" className="size-5 shrink-0" />{missingLabels.length ? 'Complete profile' : 'Review profile'}<ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" /></Link>
      <button type="button" className={styles.profileToggle} aria-expanded={showDetails} aria-controls="home-profile-details" onClick={() => setShowDetails(value => !value)}><InformationCircleIcon aria-hidden="true" className="size-4 shrink-0" /><span>How your profile is used</span><ChevronDownIcon aria-hidden="true" className={`${styles.disclosureChevron} ${showDetails ? styles.rotated : ''}`} /></button>
    </div>
    <div id="home-profile-details" className={styles.profileDetails} hidden={!showDetails}>
      <p className={styles.profileNote}>Update once. Reuse for every new job.</p>
      <div className={styles.profileNext}>
      <p>{missingLabels.length ? <><strong>Next to add:</strong> {missingLabels.slice(0, 2).join(', ')}{missingLabels.length > 2 ? ` + ${missingLabels.length - 2} more` : ''}. More complete details give every new resume a stronger starting point.</> : <>Your profile is saved and ready to reuse. Keep it current as your experience changes.</>}</p>
      </div>
      <Link href="/optimize/target" className={styles.action}>Optimize Resume for a Job <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" /></Link>
      <ProfileWorkflow />
      <p className={styles.profileNote}>Your profile stays saved for future jobs. Updating it does not rewrite previously saved optimized resumes.</p>
      <div aria-label="Profile actions" className={styles.footer}><CareerProfileResumeButton showHint={false} /><Link href="/profile?view=settings" className={styles.action}><Cog6ToothIcon aria-hidden="true" className="size-4" /> Profile settings</Link></div>
    </div><div className={styles.profileLinks}><Link href="/linkedin-optimization">LinkedIn guidance</Link><Link href="/naukrigulf-optimization">NaukriGulf guidance</Link></div></details>
  </section>
}

export function HomeSavedWork({ overview, loading, error, onRetry }: { overview: DashboardOverview | null; loading: boolean; error: boolean; onRetry: () => void }) {
  const rows = [
    { label: 'Resumes', href: '/dashboard/library', tone: 'tailor', count: overview?.resume_count, Icon: DocumentTextIcon },
    { label: 'Cover letters', href: '/cover-letter', tone: 'letter', count: overview?.cover_letter_count, Icon: EnvelopeIcon },
    { label: 'Interview Q&A', href: '/interview-qa', tone: 'qa', count: overview?.qa_set_count, Icon: QuestionMarkCircleIcon },
    { label: 'Mock interviews', href: '/mock-interview', tone: 'mock', count: overview?.mock_interview_count, Icon: ChatBubbleLeftRightIcon },
  ]
  return <section aria-labelledby="saved-work-heading" className={styles.savedPanel}><div className={styles.savedHeading}><h2 id="saved-work-heading">Your saved work</h2><Link href="/dashboard/library" aria-label="View your Resume Library" className={styles.action}><ChevronRightIcon aria-hidden="true" className="size-5" /></Link></div>
    {error ? <div role="alert" className="mb-3 rounded-ctl bg-alert-soft p-3 type-helper text-alert">Saved totals could not be loaded. <button type="button" onClick={onRetry} className="min-h-11 underline">Try again</button></div> : null}
    <div aria-busy={loading} className={styles.saved}>{rows.map(({ label, href, count, Icon, tone }) => <Link href={href} key={href} data-ui-service={tone} className={styles.savedRow}><span aria-hidden="true" className={styles.savedIcon}><Icon className="size-5" /></span><span className={styles.savedLabel}>{label}</span><span className={styles.savedCount}>{!loading && !error && count !== undefined ? count : '—'}</span><ChevronRightIcon aria-hidden="true" className="size-4 shrink-0" /></Link>)}</div>
  </section>
}
