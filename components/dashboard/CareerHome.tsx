'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRightIcon, ChevronRightIcon, Cog6ToothIcon, DocumentTextIcon, EnvelopeIcon, PencilSquareIcon, ChatBubbleLeftRightIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { CareerProfileResumeButton } from '@/components/resume/CareerProfileResumeButton'
import { ScoreRing } from '@/components/profile/ScoreRing'
import { totalExperienceYears, gccExperience } from '@/lib/experienceYears'
import { gccCountryFromLocation } from '@/lib/jobMatch/gccLocation'
import { profileHeadline } from '@/lib/resumeHeadline'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { GulfReadinessResult } from '@/lib/gulfReadiness/types'
import type { DashboardOverview } from '@/lib/dashboardOverview'
import styles from './career-home.module.css'

export function HomeScores({ profile, score, missing, gulf, loading, error }: {
  profile: CareerProfileFull | null; score: number; missing: number; gulf: GulfReadinessResult | null; loading: boolean; error: boolean
}) {
  const available = !loading && !error && Boolean(profile)
  return <section aria-label="Your readiness scores" aria-busy={loading} className={styles.scores}>
    <Link href="/profile?view=completeness" className={styles.score}>
      <ScoreRing value={available ? score : null} size={52} label="Profile complete" />
      <span className={styles.scoreCopy}><span className="type-helper text-ink-soft">Profile complete</span><span className="type-helper text-teal">{loading ? 'Loading…' : error ? 'Unavailable' : !profile ? 'Get started' : missing ? `${missing} left` : 'All details added'} <ArrowRightIcon aria-hidden="true" className="size-3.5" /></span></span>
    </Link>
    <Link href="/profile?view=readiness" className={styles.score}>
      <ScoreRing value={available && gulf ? gulf.finalScore : null} size={52} suffix="/100" label="Gulf readiness" />
      <span className={styles.scoreCopy}><span className="type-helper text-ink-soft">Gulf readiness</span><span className="type-helper text-teal">{loading ? 'Loading…' : error ? 'Unavailable' : profile ? 'Review' : 'Add profile'} <ArrowRightIcon aria-hidden="true" className="size-3.5" /></span></span>
    </Link>
  </section>
}

export function HomeProfile({ profile, loading, error }: { profile: CareerProfileFull | null; loading: boolean; error: boolean }) {
  if (loading) return <section aria-label="Loading your profile" aria-busy="true" className={styles.profile}><div className="h-48 animate-pulse rounded-ctl bg-canvas motion-reduce:animate-none" /></section>
  if (!profile || error) return <section aria-labelledby="home-profile-heading" className={styles.profile}>
    <h2 id="home-profile-heading" className="type-section text-ink">Your Career Profile</h2>
    <p className="mt-2 type-body text-ink-soft">{error ? 'Your profile could not be loaded.' : 'Add your CV to start.'}</p>
    {error ? <button type="button" className={styles.action} onClick={() => window.location.reload()}>Try again <ArrowRightIcon aria-hidden="true" className="size-4" /></button> : <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1"><Link className={styles.action} href="/profile?import=upload">Upload CV</Link><Link className={styles.action} href="/profile?import=paste">Paste CV</Link><Link className={styles.action} href="/profile?view=details">Enter details</Link></div>}
  </section>
  const years = totalExperienceYears(profile)
  const gcc = gccExperience(profile.work_experience, location => gccCountryFromLocation(location)?.country ?? null)
  const initials = (profile.full_name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('') || 'Me'
  const headline = profileHeadline(profile.additional_information)?.value?.trim()
  const facts = [
    { label: 'Experience', value: years === null ? 'Add experience' : `${years} ${years === 1 ? 'year' : 'years'}`, section: 'sec_work_experience' },
    { label: 'Target role', value: profile.target_job_title || 'Add role', section: 'sec_status' },
    { label: 'GCC experience', value: gcc.roles ? `${gcc.years} ${gcc.years === 1 ? 'year' : 'years'} · ${gcc.countries.length} ${gcc.countries.length === 1 ? 'country' : 'countries'}` : 'Add Gulf experience', section: 'sec_work_experience' },
    { label: 'Location', value: profile.current_location || 'Add location', section: 'sec_identity' },
  ]
  return <section aria-label="Your Career Profile" className={styles.profile}>
    <div className={styles.identity}>
      <Link href="/profile?view=details" aria-label="Edit your Career Profile" className={styles.avatar}>
        {/* The existing photo is optional; initials are the normal empty-photo state. */}
        {profile.photo_url ? <Image src={profile.photo_url} alt="" width={52} height={52} unoptimized className="h-full w-full object-cover" /> : <span aria-hidden="true">{initials}</span>}
      </Link>
      <div className="min-w-0 flex-1"><h2 className="break-words type-card text-ink">{profile.full_name || 'Your Career Profile'}</h2><p className="mt-1 break-words type-helper text-ink-muted">{headline || 'Your Career Profile'}</p></div>
      <Link href="/profile?view=details" className={styles.action}><PencilSquareIcon aria-hidden="true" className="size-4" /> Edit</Link>
    </div>
    <div className={styles.facts}>{facts.map(f => <Link key={f.label} href={`/profile?open=${f.section}`} className={styles.factLink}><span className="type-helper text-ink-muted">{f.label}</span><span>{f.value}</span></Link>)}</div>
    <div className={styles.summary}><DocumentTextIcon aria-hidden="true" className="size-5 shrink-0 text-teal" /><p className="min-w-0 flex-1 type-helper text-ink-muted">{profile.work_experience.length} {profile.work_experience.length === 1 ? 'role' : 'roles'} · {profile.education.length} {profile.education.length === 1 ? 'qualification' : 'qualifications'} · {profile.skills.length} skills</p><Link href="/profile?view=details" className={styles.action}>View all details <ArrowRightIcon aria-hidden="true" className="size-3.5" /></Link></div>
    <div aria-label="Profile actions" className={styles.footer}><CareerProfileResumeButton showHint={false} /><Link href="/profile?view=settings" className={styles.action}><Cog6ToothIcon aria-hidden="true" className="size-4" /> Profile settings</Link></div>

  </section>
}

export function HomeSavedWork({ overview, loading, error, onRetry }: { overview: DashboardOverview | null; loading: boolean; error: boolean; onRetry: () => void }) {
  const rows = [
    { label: 'CVs', href: '/dashboard/library', count: overview?.resume_count, Icon: DocumentTextIcon, tone: 'ui-nav-library' },
    { label: 'Cover letters', href: '/cover-letter', count: overview?.cover_letter_count, Icon: EnvelopeIcon, tone: 'ui-nav-letter' },
    { label: 'Interview Q&A', href: '/interview-qa', count: overview?.qa_set_count, Icon: QuestionMarkCircleIcon, tone: 'ui-nav-qa' },
    { label: 'Mock interviews', href: '/mock-interview', count: overview?.mock_interview_count, Icon: ChatBubbleLeftRightIcon, tone: 'ui-nav-mock' },
  ]
  return <section aria-labelledby="saved-work-heading"><div className="mb-2 flex items-center justify-between gap-3"><h2 id="saved-work-heading" className="type-section text-ink">Saved work</h2><Link href="/dashboard/library" className={styles.action}>View all <ArrowRightIcon aria-hidden="true" className="size-3.5" /></Link></div>
    {error ? <div role="alert" className="mb-3 rounded-ctl bg-alert-soft p-3 type-helper text-alert">Saved totals could not be loaded. <button type="button" onClick={onRetry} className="min-h-11 underline">Try again</button></div> : null}
    <div aria-busy={loading} className={styles.saved}>{rows.map(({ label, href, count, Icon, tone }) => <Link href={href} key={href} className={styles.savedRow}><span aria-hidden="true" className={`${tone} flex size-8 shrink-0 items-center justify-center rounded-lg`}><Icon className="size-4" /></span><span className="min-w-0 flex-1 type-body text-ink">{label}</span><span className="type-helper tabular-nums text-ink-muted">{!loading && !error && count !== undefined ? count : '—'}</span><ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" /></Link>)}</div>
  </section>
}
