'use client'

import Link from 'next/link'
import { DocumentTextIcon, ArrowUpRightIcon, ChevronDownIcon, MapIcon } from '@heroicons/react/24/outline'
import { HowItWorks } from '@/components/journey/HowItWorks'
import { HomeProfile, HomeSavedWork, HomeScores, HomeSavedPractice } from '@/components/dashboard/CareerHome'
import { useCallback, useEffect, useRef, useState } from 'react'
import { StageRail } from '@/components/journey/JourneyStepper'
import { stageSnapshot, stageStates } from '@/components/journey/stages'
import { displayFirstName } from '@/lib/utils'
import { type PackageSummary } from '@/lib/packageSummary'
import { fetchHomePackages } from '@/lib/homeFollowThrough'
import { HomeNextStep, HomeUpcomingDates, HomeDateNotice } from '@/components/dashboard/HomeFollowThrough'
import { InterviewProgressOverview } from '@/components/dashboard/InterviewProgressOverview'
import { OverallProgress } from '@/components/dashboard/ActivityOverview'
import { dashboardNextAction, type DashboardOverview } from '@/lib/dashboardOverview'
import { calculateReadiness } from '@/lib/readiness'
import { computeNextAction } from '@/lib/nextAction'
import { answersFromReadinessCategory, scoreProfileReadiness, scoringInputFromProfile } from '@/lib/gulfReadiness/fromProfile'
import homeStyles from '@/components/dashboard/career-home.module.css'
import type { CareerProfileFull } from '@/types/careerProfile'

/** Overall scores, saved totals and progress; individual resumes live in the Library. */
export default function DashboardPage() {
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const update = () => setClock(new Date())
    const timer = window.setInterval(update, 60_000)
    window.addEventListener('focus', update)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update) }
  }, [])
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [profileError, setProfileError] = useState(false)
  const [packages, setPackages] = useState<PackageSummary[]>([])
  const [packagesLoaded, setPackagesLoaded] = useState(false)
  const [packagesError, setPackagesError] = useState(false)
  // A CV reading kept on the server until the user decides (migration 047).
  // When there is one, it is the next step above everything else.
  const [hasPendingDraft, setHasPendingDraft] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const didInit = useRef(false)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState(false)
  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    setOverviewError(false)
    try {
      const res = await fetch('/api/dashboard/overview', { cache: 'no-store' })
      if (!res.ok) throw new Error('Could not load activity totals')
      setOverview(await res.json() as DashboardOverview)
    } catch {
      setOverviewError(true)
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    void loadOverview()
    // Profile drives the ring, name, target line and "items left".
    fetch('/api/profile', { cache: 'no-store' })
      .then((res) => { if (res.status === 404) return null; if (!res.ok) throw new Error('Unable to load profile'); return res.json() })
      .then((data) => data && setProfile(data as CareerProfileFull))
      .catch(() => {
        setProfileError(true)
        setLoadError(true)
      })
      // Loaded flag so the "create your profile" nudge shows only after we KNOW
      // there is no profile — never a flash before the fetch resolves.
      .finally(() => setProfileLoaded(true))
    // Summaries choose the next destination; all-account totals use the aggregate RPC.
    fetchHomePackages()
      .then(setPackages)
      .catch(() => { setPackagesError(true); setLoadError(true) })
      .finally(() => setPackagesLoaded(true))
    // A CV reading waiting for a decision (migration 047). Best-effort: if it
    // cannot be read, the dashboard simply shows its usual next step.
    fetch('/api/profile/pending-draft', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then((data) => setHasPendingDraft(Boolean(data?.pending)))
      .catch(() => {
        /* non-fatal */
      })
  }, [loadOverview])

  // No name, no "Good evening, there" — a greeting to nobody reads as a bug.
  const firstName = profile ? displayFirstName(profile.full_name) : ''
  // Ring score: the stored readiness_score (recomputed on save) is authoritative;
  // "still needed" reuses the same field-level calc as /profile — same
  // function, same weights, nothing recomputed differently here.
  const readiness = profile
    ? calculateReadiness({
        currently_in_gulf: profile.currently_in_gulf,
        full_name: profile.full_name,
        phone: profile.phone,
        email: profile.email,
        current_location: profile.current_location,
        target_job_title: profile.target_job_title,
        target_country: profile.target_country || undefined,
        target_industry: profile.target_industry,
        target_company: profile.target_company,
        visa_status: profile.visa_status,
        visa_transferable: profile.visa_transferable,
        notice_period: profile.notice_period,
        passport_validity_date: profile.passport_validity_date,
        work_experience: profile.work_experience.map((w) => ({
          start_date: w.start_date,
          end_date: w.end_date || null,
        })),
        education: profile.education,
        certifications: profile.certifications,
        skills: profile.skills,
      })
    : null
  const score = profile?.readiness_score ?? readiness?.score ?? 0
  const missing = readiness?.missing ?? []
  // Gulf Readiness (the arithmetic market score, distinct from Profile Strength
  // above) now lives on the dashboard too — founder decision 2026-08-18. It needs
  // the funnel scenario, which the dashboard has no sessionStorage handoff for, so
  // it is reconstructed from the same category the completeness engine already
  // derived. Same engine, same number the user saw; shown only once a profile exists.
  const gulfAnswers = readiness ? answersFromReadinessCategory(readiness.category) : null
  // Same pure arithmetic the profile page runs — no network, no model call.
  const gulf = gulfAnswers && profile ? scoreProfileReadiness(scoringInputFromProfile(profile), gulfAnswers) : null

  // Next best action — one action, chosen from real state.
  //
  // The three-tier ternary that stood here could not see a half-finished job:
  // a user who set one up and stopped was told to "optimize your next
  // application", with no route back to the one they had already started. The
  // rules moved to lib/nextAction.ts, which reads only what these same two
  // fetches already returned.
  const nextAction = dashboardNextAction(computeNextAction(profile, packages, score, missing.length, hasPendingDraft))

  const ready = profileLoaded && packagesLoaded && !loadError
  // The map follows progress; the teal panel follows the next action. They
  // differ only when a CV reading is waiting, which is a to-do, not a step.
  const snap = (ready ? stageSnapshot(profile ? score : null, packages) : null)
  const states = snap?.states ?? stageStates('profile', { profileDone: false, cvDone: false, applyDone: false })

  return (
    <div className={`ui-page page-gutter mx-auto flex w-full max-w-[900px] flex-col pb-10 font-redesign-sans ${homeStyles.page}`}>
      <header className={homeStyles.pageHeading}>
        <div className="min-w-0 w-full"><div className={homeStyles.mobileGreeting}><span>{firstName ? `Hello, ${firstName}` : 'Your Gulf career workspace'}</span><time dateTime={clock.toISOString()}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(clock)}</time></div><p className="sr-only">{firstName ? `Good ${greeting()}, ${firstName}` : 'Your Gulf career workspace'}</p><h1><span className="md:hidden">Your career workspace</span><span className="hidden md:inline">Your next move starts here.</span></h1><p>One profile. A plan for every opening.</p></div>
      </header>

      <div className={homeStyles.mobileScores}><HomeScores profile={profile} score={score} missing={missing.length} gulf={gulf} loading={!profileLoaded} error={profileError} /></div>

      {!profile ? <HomeProfile profile={profile} loading={!profileLoaded} error={profileError} score={score} gulf={gulf} missingLabels={missing.map(item => item.label)} /> : null}
      <HomeDateNotice packages={packages} ready={packagesLoaded && !packagesError} now={clock} />

      {/* The empty profile already provides Step 1 and its create action. */}
      {!ready || nextAction.state !== 'no_profile' ? <HomeNextStep action={nextAction} packages={packages} ready={ready} error={loadError} onRetry={() => window.location.reload()} /> : null}

      {!overviewError && packagesLoaded && !packagesError && (overview?.mock_in_progress_count ?? 0) > 0 && !packages.some(pkg => pkg.mock_in_progress) ? <HomeSavedPractice count={overview!.mock_in_progress_count} /> : null}

      <HomeSavedWork overview={overview} loading={overviewLoading} error={overviewError} onRetry={() => void loadOverview()} />

      {profile ? <div className={homeStyles.profileFoundation}><HomeProfile profile={profile} loading={!profileLoaded} error={profileError} score={score} gulf={gulf} missingLabels={missing.map(item => item.label)} /></div> : null}

      {ready && packages.length > 0 ? <details className={`group ${homeStyles.disclosureCard}`}><summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 p-4 type-label text-ink"><span className="flex min-w-0 items-center gap-2"><DocumentTextIcon aria-hidden="true" className="size-5 shrink-0 text-teal" />Recent resumes</span><ChevronDownIcon className="size-4 shrink-0 text-teal group-open:rotate-180" aria-hidden="true" /></summary><div className="divide-y divide-line border-t border-line">{packages.slice(0,3).map(item => <Link key={item.id} href={`/package/${encodeURIComponent(item.id)}`} className="flex min-h-16 items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal"><DocumentTextIcon className="size-5 shrink-0 text-teal" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block break-words type-label text-ink">{item.name || item.target_job_title}</span><span className="block type-caption text-ink-muted">{[item.target_company,item.target_country?.replaceAll('_',' ')].filter(Boolean).join(' · ') || 'Gulf application'}</span></span><ArrowUpRightIcon className="size-4 shrink-0 text-teal" aria-hidden="true" /></Link>)}</div></details> : null}

      <HomeUpcomingDates packages={packages} now={clock} loading={!packagesLoaded} error={packagesError} onRetry={() => window.location.reload()} />

      <details className={`group ${homeStyles.disclosureCard}`}><summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 p-4 type-label text-ink"><span className="flex min-w-0 items-center gap-2"><MapIcon aria-hidden="true" className="size-5 shrink-0 text-teal" />Journey & progress</span><ChevronDownIcon className="size-4 shrink-0 text-teal group-open:rotate-180" aria-hidden="true" /></summary><div className="flex flex-col gap-6 border-t border-line p-4 sm:p-5">{ready ? <StageRail states={states} /> : null}{overview && !overviewError ? <OverallProgress overview={overview} /> : null}<InterviewProgressOverview /></div></details>
      <div className="self-start"><HowItWorks /></div>
    </div>
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
