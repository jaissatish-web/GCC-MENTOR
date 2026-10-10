'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { StageExplainer } from '@/components/journey/JourneyStepper'
import { stageById, stageSnapshot, stageStates } from '@/components/journey/stages'
import { ScoreCards } from '@/components/profile/ProfileOverview'
import { displayFirstName } from '@/lib/utils'
import { type PackageListPage, type PackageSummary } from '@/lib/packageSummary'
import { DashboardNextStep } from '@/components/dashboard/DashboardNextStep'
import { InterviewProgressOverview } from '@/components/dashboard/InterviewProgressOverview'
import { ActivityOverview, OverallProgress } from '@/components/dashboard/ActivityOverview'
import { dashboardNextAction, type DashboardOverview } from '@/lib/dashboardOverview'
import { calculateReadiness } from '@/lib/readiness'
import { computeNextAction, focusJob } from '@/lib/nextAction'
import { answersFromReadinessCategory, scoreProfileReadiness, scoringInputFromProfile } from '@/lib/gulfReadiness/fromProfile'
import type { CareerProfileFull } from '@/types/careerProfile'

/** Overall scores, saved totals and progress; individual resumes live in the Library. */
export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
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
  const snap = ready ? stageSnapshot(profile ? score : null, packages) : null
  const current = snap?.current ?? null
  const states = snap?.states ?? stageStates('profile', { profileDone: false, cvDone: false, applyDone: false })
  const currentStage = current ? stageById(current) : null
  const focusedJob = ready && current !== 'profile' ? focusJob(packages) : null
  const draftWaiting = nextAction.state === 'draft_waiting'
  const firstRun = ready && nextAction.state === 'no_profile'

  return (
    <div className="page-gutter mx-auto flex w-full max-w-[1120px] flex-col gap-5 pb-10 pt-5 font-redesign-sans sm:gap-6 lg:pt-8">
      <header className="flex flex-col gap-1">
        <h1 className="type-title text-ink">
          {firstName ? `Good ${greeting()}, ${firstName}` : profileLoaded ? 'Welcome to GCC MENTOR' : `Good ${greeting()}`}
        </h1>
        <p className="type-body text-ink-soft">
          {firstRun
            ? 'Three steps from your current CV to an interview-ready application.'
            : 'Continue your application, then check your scores and saved progress.'}
        </p>
      </header>

      <DashboardNextStep ready={ready} loadError={loadError} draftWaiting={draftWaiting} firstRun={firstRun} currentStage={currentStage} states={states} focusedJob={focusedJob} nextAction={nextAction} />

      <section aria-labelledby="scores-heading" className="flex flex-col gap-3">
        <h2 id="scores-heading" className="type-section text-ink">Your profile scores</h2>
        {!profileLoaded ? <div aria-label="Loading profile scores" className="grid grid-cols-2 gap-3"><div className="h-52 animate-pulse rounded-card bg-canvas" /><div className="h-52 animate-pulse rounded-card bg-canvas" /></div> : profile ? (
          <ScoreCards
            className="m-0"
            completeness={{ score, itemsLeft: missing.length, detail: missing.length === 0 ? 'Every section is complete' : `Add: ${missing.slice(0, 2).map((m) => m.label.toLowerCase()).join(', ')}${missing.length > 2 ? '…' : ''}` }}
            gulf={gulf}
            onOpenCompleteness={() => router.push('/profile?view=completeness')}
            onOpenReadiness={() => router.push('/profile?view=readiness')}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Link href="/profile" className="flex flex-col gap-2 rounded-card border border-line bg-white p-5"><span className="type-card text-teal">Profile complete</span><span className="type-body text-ink">{loadError ? 'Unavailable' : 'Not started'}</span><span className="type-helper text-ink-muted">Add your CV or enter your experience.</span><span className="type-helper font-semibold text-teal">Open Career Profile →</span></Link>
            <Link href="/profile?view=readiness" className="flex flex-col gap-2 rounded-card border border-line bg-white p-5"><span className="type-card text-teal">Gulf Readiness</span><span className="type-body text-ink">{loadError ? 'Unavailable' : 'Add your profile'}</span><span className="type-helper text-ink-muted">Your saved profile is used to calculate this score.</span><span className="type-helper font-semibold text-teal">See readiness →</span></Link>
          </div>
        )}
      </section>

      <ActivityOverview overview={overview} loading={overviewLoading} error={overviewError} onRetry={() => void loadOverview()} />
      <details className="group rounded-card border border-line bg-white p-4 shadow-m-1 sm:p-6">
        <summary className="min-h-11 cursor-pointer rounded-ctl type-card text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
          Detailed progress and interview reports
          <span className="mt-1 block type-helper font-normal text-ink-muted">Expand to see application coverage and practice feedback.</span>
        </summary>
        <div className="mt-5 flex flex-col gap-6">
          {overview && !overviewError ? <OverallProgress overview={overview} /> : null}
          <InterviewProgressOverview />
        </div>
      </details>

      {/* Until step 1 is done, show what the three steps give — the product
          explaining itself, instead of an empty jobs list and blank scores. */}
      {snap && !snap.facts.profileDone && packages.length === 0 ? <StageExplainer states={states} /> : null}

    </div>
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
