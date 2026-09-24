'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Pill } from '@/components/ui/Pill'
import { ProfileKickstart } from '@/components/profile/ProfileKickstart'
import { LiveReadiness } from '@/components/gulfReadiness/LiveReadiness'
import { buttonVariants } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { BriefcaseIcon } from '@heroicons/react/24/outline'
import { cn, displayFirstName, GULF_COUNTRIES, packageStatusLabel, resumeLabel } from '@/lib/utils'
import { cvReady, letterCount, mockDone, qaReady, type PackageListPage, type PackageSummary } from '@/lib/packageSummary'
import { calculateReadiness } from '@/lib/readiness'
import { computeNextAction, focusJob, PROFILE_THIN_BELOW } from '@/lib/nextAction'
import { answersFromReadinessCategory, scoringInputFromProfile } from '@/lib/gulfReadiness/fromProfile'
import type { CareerProfileFull } from '@/types/careerProfile'

/**
 * Dashboard — screens D1/D2 (TASK-034), route /dashboard.
 *
 * TASK-083 restyle (2026-08-12), per docs/redesign/PAGE_SPECS.md §C.
 * VISUAL-ONLY + two spec-approved content corrections. Every data source is
 * identical to before: GET /api/profile, GET /api/packages,
 * calculateReadiness() — same calls, same fields, same logic. No new query.
 *
 * SIMPLIFIED (2026-09-24, founder: "looks very complicated"). Three blocks:
 * the ONE next step (lib/nextAction.ts) with "N of 7 done", the target jobs
 * with CV · Letter · Q&A · Mock at a glance, and the two scores — Profile
 * strength and Gulf Readiness — each saying what it measures. The journey list,
 * metric tiles, quick actions, usage totals and planned card were removed:
 * each repeated the menu or another block. Still no new request.
 *
 * Two approved corrections, not scope creep:
 *  (1) the stale "ATS score check" locked tile is DROPPED (the scanner has
 *      been live since TASK-058) — it no longer appears anywhere.
 *  (2) a third metric tile, "Latest Job Match", once sat beside those two.
 *      REMOVED 2026-09-04 with the standalone Job Match service (founder
 *      decision). Not replaced: the Gulf Readiness figure already has its own
 *      widget on this page, so a third tile would have repeated it.
 */

/**
 * A country a user would recognise, or nothing.
 *
 * `generic_gulf` is what the form stores when nobody picked a country, so it
 * returns null rather than printing "Generic Gulf" — our enum, not their job.
 */
function dashboardCountryLabel(value: string | null): string | null {
  if (!value || value === 'generic_gulf') return null
  return GULF_COUNTRIES.find((c) => c.value === value)?.label ?? null
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// Pull a JobMatchResult out of the most recent package's already-fetched
// `ats_score_card` jsonb (Phase-2 reservation slot; the ATS scan stores
// `job_match` there when a JD was provided). Display-only — no computation.

export default function DashboardPage() {
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [packages, setPackages] = useState<PackageSummary[]>([])
  // Every job the user has, not just the page of summaries below (audit M08).
  const [packageTotal, setPackageTotal] = useState<number | null>(null)
  const [packagesLoaded, setPackagesLoaded] = useState(false)
  // A CV reading kept on the server until the user decides (migration 047).
  // When there is one, it is the next step above everything else.
  const [hasPendingDraft, setHasPendingDraft] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
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
    // Lightweight summaries of the newest 50 jobs plus the total (audit M08) —
    // enough for Recent Activity, the metric row and the next step, without
    // downloading every job's CV, letters and interview transcripts.
    fetch('/api/packages?view=summary&limit=50&counts=1', { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error('Unable to load packages'); return res.json() as Promise<PackageListPage> })
      .then((data) => {
        if (Array.isArray(data?.packages)) setPackages(data.packages)
        if (typeof data?.total === 'number') setPackageTotal(data.total)
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
  }, [])

  // No name, no "Good evening, there" — a greeting to nobody reads as a bug.
  const firstName = profile ? displayFirstName(profile.full_name) : ''
  const country = profile ? GULF_COUNTRIES.find((c) => c.value === profile.target_country)?.label : undefined
  const targetParts =
    profile !== null
      ? [profile.target_job_title, country, profile.target_company].filter(Boolean).join(' · ')
      : ''

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
  const packageCount = packageTotal ?? packages.length

  // Next best action — one action, chosen from real state.
  //
  // The three-tier ternary that stood here could not see a half-finished job:
  // a user who set one up and stopped was told to "optimize your next
  // application", with no route back to the one they had already started. The
  // rules moved to lib/nextAction.ts, which reads only what these same two
  // fetches already returned.
  const nextAction = computeNextAction(profile, packages, score, missing.length, hasPendingDraft)

  // The journey tracker reads the same two responses — nothing new is fetched.
  // Its job steps follow the job the next step is about (lib/nextAction.ts
  // focusJob), so the two panels never disagree.
  const focus = focusJob(packages)
  const journeyFacts =
    profileLoaded && packagesLoaded && !loadError
      ? {
          hasProfile: profile !== null,
          profileSolid: profile !== null && score >= PROFILE_THIN_BELOW,
          hasTargetJob: focus !== null,
          hasOptimizedCv: focus !== null && cvReady(focus),
          hasLetter: focus !== null && letterCount(focus) > 0,
          hasQa: focus !== null && qaReady(focus),
          hasMock: focus !== null && mockDone(focus),
        }
      : null

  const stepsDone = journeyFacts ? Object.values(journeyFacts).filter(Boolean).length : 0
  const listedJobs = packages.slice(0, 5)

  return (
    // SIMPLIFIED 2026-09-24 (founder: "dashboard looks very complicated").
    // Three questions, in the order a returning user asks them, and nothing
    // else: what do I do next → where are my jobs → how strong am I. Quick
    // actions, usage counts, the seven-row journey, metric tiles and the
    // planned-service card all repeated the menu or each other and are gone.
    // Same three fetches as before; no new request.
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 pb-10 pt-5 font-redesign-sans sm:px-6 lg:pt-8">
      <ProfileKickstart show={profileLoaded && !loadError && profile === null} />

      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[24px] font-semibold leading-tight text-ink sm:text-[30px]">
          {firstName ? `Good ${greeting()}, ${firstName}` : profileLoaded ? 'Welcome to GCC MENTOR' : `Good ${greeting()}`}
        </h1>
        <p className="text-[14px] text-ink-soft">
          {targetParts ? `Targeting ${targetParts}` : "Let's get you closer to your next opportunity."}
        </p>
      </header>

      {/* THE ONE NEXT STEP — teal panel, the screen's single gold button. */}
      <section aria-label="Your next step" className="flex flex-col gap-4 rounded-card bg-teal p-5 shadow-m-2 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-soft">
            Your next step{journeyFacts ? ` · ${stepsDone} of 7 done` : ''}
          </span>
          <h2 className="font-display text-[20px] font-semibold leading-snug text-white sm:text-[22px]">
            {loadError ? 'Your saved work could not be loaded' : profileLoaded && packagesLoaded ? nextAction.title : 'Loading your next step…'}
          </h2>
          <p className="max-w-[60ch] text-[14px] leading-relaxed text-teal-soft/90">
            {loadError
              ? 'Please try again to see your latest profile and application progress.'
              : profileLoaded && packagesLoaded
                ? nextAction.body
                : 'Checking your profile and saved applications.'}
          </p>
          {journeyFacts ? (
            <div className="mt-1 h-1.5 w-full max-w-[320px] overflow-hidden rounded-full bg-white/15" aria-hidden="true">
              <div className="h-full rounded-full bg-gold" style={{ width: `${(stepsDone / 7) * 100}%` }} />
            </div>
          ) : null}
        </div>
        {loadError ? (
          <button type="button" onClick={() => window.location.reload()} className="min-h-11 shrink-0 rounded-ctl bg-white px-5 py-3 text-sm font-semibold text-teal">
            Try again
          </button>
        ) : profileLoaded && packagesLoaded ? (
          <Link
            href={nextAction.href}
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-ctl bg-gold px-6 text-[15px] font-bold text-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal"
          >
            {nextAction.cta}
          </Link>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Target jobs: each with its pack at a glance ── */}
        <section aria-labelledby="jobs-h" className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="jobs-h" className="font-display text-[19px] font-semibold text-ink">
              Your target jobs
            </h2>
            <div className="flex items-center gap-3">
              {packageCount > listedJobs.length ? (
                <Link href="/dashboard/library" className="text-[13px] font-semibold text-teal hover:underline">
                  See all {packageCount}
                </Link>
              ) : null}
              {profile ? (
                <Link href="/optimize/target" className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'whitespace-nowrap')}>
                  + Add job
                </Link>
              ) : null}
            </div>
          </div>
          {!packagesLoaded ? (
            <div className="flex flex-col gap-2">
              <div className="h-20 animate-pulse rounded-card bg-white" />
              <div className="h-20 animate-pulse rounded-card bg-white" />
            </div>
          ) : listedJobs.length === 0 ? (
            <EmptyState
              tone="inline"
              icon={BriefcaseIcon}
              title="No target jobs yet"
              body="Add a job you want to apply for. It gets its own CV, cover letter and interview preparation."
              action={
                profile ? (
                  <Link href="/optimize/target" className={buttonVariants({ variant: 'secondary' })}>
                    Add a target job
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {listedJobs.map((pkg) => (
                <li key={pkg.id}>
                  <Link
                    href={`/package/${pkg.id}`}
                    className="flex flex-col gap-3 rounded-card border border-line bg-white p-4 shadow-m-1 transition-colors hover:border-teal/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-semibold text-ink">{resumeLabel(pkg)}</span>
                      <span className="truncate text-[13px] text-ink-muted">
                        {[pkg.target_company, dashboardCountryLabel(pkg.target_country)].filter(Boolean).join(' · ') ||
                          `Added ${relativeTime(pkg.created_at)}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-wrap items-center gap-2">
                      <PackDots pkg={pkg} />
                      <Pill variant={pkg.status}>{packageStatusLabel(pkg.status)}</Pill>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── The two scores, each saying plainly what it measures ── */}
        <aside className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="strength-h" className="flex flex-col gap-3 rounded-card border border-line bg-white p-5 shadow-m-1">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="strength-h" className="text-[14px] font-semibold text-ink">
                Profile strength
              </h2>
              <span className="font-display text-[26px] font-semibold leading-none text-teal">{profile ? `${score}%` : '—'}</span>
            </div>
            <p className="-mt-1 text-[13px] text-ink-muted">How complete your Career Profile is.</p>
            <ProgressBar value={profile ? score : 0} tone="light" getValueLabel={(v) => `${v} out of 100`} />
            <p className="text-[13px] text-ink-soft">
              {!profile
                ? 'Not started — upload your CV to begin.'
                : missing.length === 0
                  ? 'Every section is complete.'
                  : `${missing.length} thing${missing.length === 1 ? '' : 's'} to add: ${missing
                      .slice(0, 3)
                      .map((m) => m.label.toLowerCase())
                      .join(', ')}${missing.length > 3 ? '…' : '.'}`}
            </p>
            <Link href={profile ? '/profile' : '/profile?import=upload'} className="text-[13px] font-semibold text-teal hover:underline">
              {!profile ? 'Build my profile →' : missing.length === 0 ? 'View Career Profile →' : 'Complete my profile →'}
            </Link>
          </section>

          {gulfAnswers && profile ? (
            <LiveReadiness answers={gulfAnswers} profile={scoringInputFromProfile(profile)} detailsHref="/profile?improve=gulf" />
          ) : null}
        </aside>
      </div>
    </div>
  )
}

/** CV · Letter · Q&A · Mock for one job — filled when done. */
function PackDots({ pkg }: { pkg: PackageSummary }) {
  const steps = [
    ['CV', cvReady(pkg)],
    ['Letter', letterCount(pkg) > 0],
    ['Q&A', qaReady(pkg)],
    ['Mock', mockDone(pkg)],
  ] as const
  const done = steps.filter(([, d]) => d).map(([l]) => l)
  return (
    <span className="flex items-center gap-1">
      <span className="sr-only">Done: {done.length ? done.join(', ') : 'nothing yet'}.</span>
      {steps.map(([label, isDone]) => (
        <span
          key={label}
          aria-hidden="true"
          className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', isDone ? 'bg-ok-soft text-ok' : 'bg-canvas text-ink-muted')}
        >
          {isDone ? '✓ ' : ''}
          {label}
        </span>
      ))}
    </span>
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
