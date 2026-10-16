'use client'

import Link from 'next/link'
import { DocumentTextIcon, ArrowUpRightIcon, Cog6ToothIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { HowItWorks } from '@/components/journey/HowItWorks'
import { HomeProfile, HomeScores, HomeSavedWork } from '@/components/dashboard/CareerHome'
import { useCallback, useEffect, useRef, useState } from 'react'
import { StageRail } from '@/components/journey/JourneyStepper'
import { stageSnapshot, stageStates } from '@/components/journey/stages'
import { displayFirstName } from '@/lib/utils'
import { type PackageListPage, type PackageSummary } from '@/lib/packageSummary'
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
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [profileError, setProfileError] = useState(false)
  const [packages, setPackages] = useState<PackageSummary[]>([])
  const [packagesLoaded, setPackagesLoaded] = useState(false)
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
    fetch('/api/packages?view=summary&limit=50', { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error('Unable to load packages'); return res.json() as Promise<PackageListPage> })
      .then((data) => {
        if (Array.isArray(data?.packages)) setPackages(data.packages)
      })
      .catch(() => {
        setLoadError(true)
      })
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
  const draftWaiting = nextAction.state === 'draft_waiting'
  const firstRun = ready && nextAction.state === 'no_profile'

  return (
    <div className={`ui-page page-gutter mx-auto flex w-full max-w-[900px] flex-col pb-10 font-redesign-sans ${homeStyles.page}`}>
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0"><h1 className="type-title text-ink">Your career, at a glance</h1><p className="mt-1 type-body text-ink-muted">{firstName ? `Good ${greeting()}, ${firstName}` : 'Your Gulf career workspace'}</p></div>
        <Link href="/settings" aria-label="Account settings" className="flex size-11 shrink-0 items-center justify-center rounded-ctl text-ink-soft hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"><Cog6ToothIcon className="size-5" aria-hidden="true" /></Link>
      </header>

      <HomeScores profile={profile} score={score} missing={missing.length} gulf={gulf} loading={!profileLoaded} error={profileError} />
      <HomeProfile profile={profile} loading={!profileLoaded} error={profileError} packages={packages} workLoading={!packagesLoaded} workError={loadError} missingLabels={missing.map(item => item.label)} />

      <section aria-label="Your next step" className="workspace-panel overflow-hidden">
        <div className={homeStyles.nextStep}>
          <div className={homeStyles.nextCopy}>
            <span className="type-caption font-medium uppercase tracking-wide text-gold-soft">{draftWaiting ? 'Review your import' : 'Next step'}</span>
            <h2 className="type-section text-white">{loadError ? 'Your saved work could not be loaded' : !ready ? 'Loading your next step…' : firstRun ? 'Create your Career Profile' : nextAction.state === 'no_target_job' ? 'Add your target job' : nextAction.title}</h2>
            <p className="max-w-[55ch] type-helper text-white/85">{loadError ? 'Please try again.' : !ready ? 'Checking saved progress.' : firstRun ? 'Upload your CV or enter your details.' : nextAction.state === 'no_target_job' ? 'Tailor your CV to a vacancy.' : nextAction.body}</p>
          </div>
          {loadError ? <button type="button" onClick={() => window.location.reload()} className={GOLD_CTA}>Try again</button> : ready && !firstRun ? <Link href={nextAction.href} className={GOLD_CTA}>{nextAction.state === 'no_target_job' ? 'Add job' : nextAction.cta} <ArrowUpRightIcon className="ml-2 size-4" aria-hidden="true" /></Link> : null}
        </div>
      </section>

      <HomeSavedWork overview={overview} loading={overviewLoading} error={overviewError} onRetry={() => void loadOverview()} />

      {ready && packages.length > 0 ? <details className="group workspace-panel"><summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 p-4 type-label text-ink">Recent CVs <ChevronDownIcon className="size-4 shrink-0 text-teal group-open:rotate-180" aria-hidden="true" /></summary><div className="divide-y divide-line border-t border-line">{packages.slice(0,3).map(item => <Link key={item.id} href={`/package/${encodeURIComponent(item.id)}`} className="flex min-h-16 items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal"><DocumentTextIcon className="size-5 shrink-0 text-teal" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block break-words type-label text-ink">{item.name || item.target_job_title}</span><span className="block type-caption text-ink-muted">{[item.target_company,item.target_country?.replaceAll('_',' ')].filter(Boolean).join(' · ') || 'Gulf application'}</span></span><ArrowUpRightIcon className="size-4 shrink-0 text-teal" aria-hidden="true" /></Link>)}</div></details> : null}

      <details className="group workspace-panel"><summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 p-4 type-label text-ink">Journey & progress <ChevronDownIcon className="size-4 shrink-0 text-teal group-open:rotate-180" aria-hidden="true" /></summary><div className="flex flex-col gap-6 border-t border-line p-4 sm:p-5">{ready ? <StageRail states={states} /> : null}{overview && !overviewError ? <OverallProgress overview={overview} /> : null}<InterviewProgressOverview /></div></details>
      <div className="self-start"><HowItWorks /></div>
    </div>
  )
}

const GOLD_CTA =
  'inline-flex min-h-12 shrink-0 items-center justify-center rounded-ctl bg-gold px-6 type-button text-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal'
function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
