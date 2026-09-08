'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import ReadinessRing from '@/components/ui/ReadinessRing'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Pill } from '@/components/ui/Pill'
import { LockedTile } from '@/components/ui/LockedTile'
import { Reveal } from '@/components/ui/Reveal'
import { ProfileKickstart } from '@/components/profile/ProfileKickstart'
import { LiveReadiness } from '@/components/gulfReadiness/LiveReadiness'
import { buttonVariants } from '@/components/ui/Button'
import { cn, GULF_COUNTRIES, resumeLabel } from '@/lib/utils'
import { calculateReadiness } from '@/lib/readiness'
import { answersFromReadinessCategory } from '@/lib/gulfReadiness/fromProfile'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { Package } from '@/types/package'

/**
 * Dashboard — screens D1/D2 (TASK-034), route /dashboard.
 *
 * TASK-083 restyle (2026-08-12), per docs/redesign/PAGE_SPECS.md §C.
 * VISUAL-ONLY + two spec-approved content corrections. Every data source is
 * identical to before: GET /api/profile, GET /api/packages,
 * calculateReadiness() — same calls, same fields, same logic. No new query.
 *
 * Composition per §C: left column = greeting + metric row (Profile Strength,
 * Resumes Created) + next-step hero strip + Recent
 * Activity + new "Planned" row (LockedTile); right rail (≥1280px) = Readiness
 * ring card, Quick Actions list, Library preview. On tablet the rail drops
 * below the main column; metric row 2-up; on mobile the Planned row is a
 * horizontally-scrollable strip.
 *
 * Two approved corrections, not scope creep:
 *  (1) the stale "ATS score check" locked tile is DROPPED (the scanner has
 *      been live since TASK-058) — it no longer appears anywhere.
 *  (2) a third metric tile, "Latest Job Match", once sat beside those two.
 *      REMOVED 2026-09-04 with the standalone Job Match service (founder
 *      decision). Not replaced: the Gulf Readiness figure already has its own
 *      widget on this page, so a third tile would have repeated it.
 */

const PLANNED_SERVICES: ReadonlyArray<{ title: string; description: string }> = [
  {
    title: 'Mock Interview',
    description: 'Practice the conversation with guided AI feedback.',
  },
  {
    title: 'Q&A / Interview Prep',
    description: 'Prepare role-specific technical and HR answers.',
  },
  {
    title: 'Saved Jobs',
    description: 'Keep track of roles you want to apply to.',
  },
]

const QUICK_ACTIONS: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Profile Strength', href: '/gcc-readiness' },
  { label: 'Optimize Resume', href: '/optimize/target' },
  { label: 'Generate Cover Letter', href: '/cover-letter' },
  { label: 'View Library', href: '/dashboard/library' },
]

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

const STATUS_LABEL: Record<Package['status'], string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  visa_processing: 'Visa processing',
  offer: 'Offer',
}

// Pull a JobMatchResult out of the most recent package's already-fetched
// `ats_score_card` jsonb (Phase-2 reservation slot; the ATS scan stores
// `job_match` there when a JD was provided). Display-only — no computation.

export default function DashboardPage() {
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [packages, setPackages] = useState<Package[]>([])
  const [packagesLoaded, setPackagesLoaded] = useState(false)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    // Profile drives the ring, name, target line and "items left".
    fetch('/api/profile', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then((data) => data && setProfile(data as CareerProfileFull))
      .catch(() => {
        /* non-fatal: dashboard renders with defaults */
      })
      // Loaded flag so the "create your profile" nudge shows only after we KNOW
      // there is no profile — never a flash before the fetch resolves.
      .finally(() => setProfileLoaded(true))
    // Same /api/packages call as before — keeping the rows, not just the
    // count, so Recent Activity and the metric row use real data.
    fetch('/api/packages', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then((data) => {
        if (Array.isArray(data?.packages)) setPackages(data.packages as Package[])
      })
      .catch(() => {
        /* non-fatal */
      })
      .finally(() => setPackagesLoaded(true))
  }, [])

  const firstName = profile ? profile.full_name.trim().split(/\s+/)[0] || 'there' : 'there'
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
  const packageCount = packages.length
  const recentPackages = packages.slice(0, 3)

  // Next Best Action — a simple three-tier rule over real state, not a
  // recommendation engine (explicitly out of scope).
  const nextAction =
    // A brand-new user is told to CREATE A RESUME, not to "complete a Career
    // Profile". They signed up to make a CV; "Career Profile" is our internal
    // name for the data behind it, and leading with it points a first-time
    // visitor at an empty form using a term they have never seen. The profile
    // is what creating a resume produces, so that is the order we ask for it in.
    !profile
      ? {
          title: 'Create your first resume',
          body: 'Upload an existing CV, paste the text, or type it in — whichever is easiest. We build your profile from it.',
          cta: 'Create resume',
          href: '/profile?import=upload',
        }
      : score < 40
      ? {
          title: 'Complete your Career Profile',
          body: missing.length
            ? `${missing.length} item${missing.length === 1 ? '' : 's'} left — each one raises your readiness score.`
            : 'A complete profile is what every future resume is built from.',
          cta: 'Complete profile',
          href: '/profile',
        }
      : packageCount === 0
        ? {
            title: 'Create your first Gulf-optimized resume',
            body: 'Pick a target role and country — your profile does the rest.',
            cta: 'Optimize resume',
            href: '/optimize/target',
          }
        : {
            title: 'Optimize your next application',
            body: `You've built ${packageCount} resume${packageCount === 1 ? '' : 's'} so far — targeting a new role takes minutes.`,
            cta: 'Optimize resume',
            href: '/optimize/target',
          }

  return (
    // BLUEPRINT (2026-09-08). Ground is `paper`, not white: the surfaces that
    // matter then sit on top of it as white, which is what gives the screen a
    // figure/ground relationship instead of a single flat sheet.
    <div className="flex min-h-full flex-col gap-6 bg-paper p-4 pb-8 font-redesign-sans sm:p-7 lg:p-9">
      {/* First-run nudge to build the Career Profile — shown only once we KNOW
          there is no profile yet. Dismissible; the dashboard's own CTA persists. */}
      <ProfileKickstart show={profileLoaded && profile === null} />

      {/* ── Header: greeting + readiness ring ── */}
      <Reveal>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            {/* Archivo, not the serif. Blueprint's voice is an instrument
                label: tight tracking, real weight, no flourish. */}
            <h1 className="font-bp-display text-[24px] font-bold leading-[1.1] tracking-[-0.02em] text-graphite sm:text-[30px]">
              Good {greeting()}, {firstName}
            </h1>
            <p className="text-[13px] text-slate">
              {targetParts ? `Targeting ${targetParts}` : "Let's get you closer to your next opportunity."}
            </p>
          </div>
          <Link
            href="/profile"
            aria-label="Profile readiness"
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-signal-ink"
          >
            <ReadinessRing score={score} size={52} dark />
          </Link>
        </div>
      </Reveal>

      {/*
        min-w-0 on the columns is required, not cosmetic. A grid item defaults
        to min-width:auto and so refuses to shrink below its content — this
        column measured 744px inside a 335px cell on a 375px phone, which is
        what forced the whole dashboard to scroll sideways.
      */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── LEFT column ── */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* METRICS ARE NOT CARDS ANY MORE.
              Two numbers in two bordered boxes ate most of a phone screen and
              pushed the actual next action below the fold — confirmed by
              looking at the live dashboard on 2026-09-08, not inferred. A
              border, a fill and a shadow each say "separate object"; a figure
              and its label are neither. They sit on the page, divided by one
              rule, and the space that bought goes to the thing the user came
              to do.

              A third tile, "Latest Job Match", was removed 2026-09-04 with the
              standalone service and is deliberately not replaced. */}
          <Reveal delay={40}>
            <div className="flex divide-x divide-edge border-y border-edge">
              <MetricTile
                label="Profile strength"
                value={`${score}%`}
                sub={readiness?.category ? categoryLabel(readiness.category) : undefined}
                href="/gcc-readiness"
              />
              <MetricTile
                label="Resumes created"
                value={packagesLoaded ? String(packageCount) : '—'}
                sub={packageCount > 0 ? 'In your Library' : undefined}
                href="/dashboard/library"
              />
            </div>
          </Reveal>

          {/* Next-step hero strip */}
          <Reveal delay={80}>
            {/* THE ONE PLACE SIGNAL IS SPENT on this screen. A single accent
                that always means "this is the thing to do" is worth more than
                a palette of tints — the moment it appears twice it means
                nothing. The left rule carries it; the panel stays white. */}
            <div className="flex h-full flex-col justify-between gap-5 border border-l-[3px] border-edge border-l-signal bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-signal-ink">
                  Your next best action
                </span>
                <h2 className="font-bp-display text-[19px] font-semibold leading-snug tracking-[-0.01em] text-graphite sm:text-[21px]">
                  {nextAction.title}
                </h2>
                <p className="text-[14px] leading-relaxed text-slate">{nextAction.body}</p>
              </div>
              <Link
                href={nextAction.href}
                className="inline-flex w-full items-center justify-center rounded-bp bg-signal px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-signal-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 sm:w-fit"
              >
                {nextAction.cta}
              </Link>
            </div>
          </Reveal>

          {/* Recent Activity */}
          <Reveal delay={110}>
            {/* A LIST, NOT A CARD OF CARDS. This was a bordered panel whose
                rows were themselves bordered panels — two containers to say one
                thing. Blueprint puts the section label on the page and divides
                the rows with a single rule, which is how a register reads. */}
            <section className="flex flex-col gap-3">
              <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate">
                Recent activity
              </div>
              {!packagesLoaded ? (
                <div className="flex flex-col divide-y divide-edge border-y border-edge bg-white">
                  <div className="h-14 animate-pulse bg-paper/70" />
                  <div className="h-14 animate-pulse bg-paper/70" />
                </div>
              ) : recentPackages.length === 0 ? (
                <div className="flex flex-col gap-1 border border-dashed border-edge-strong/50 bg-white p-5">
                  <span className="text-[13px] font-semibold text-graphite">No activity yet</span>
                  <span className="text-[13px] leading-relaxed text-slate">
                    Optimize a resume and it will show up here.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-edge border-y border-edge bg-white">
                  {recentPackages.map((pkg) => (
                    <Link
                      key={pkg.id}
                      href={`/package/${pkg.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[13px] font-semibold text-graphite">
                          Optimized for {resumeLabel(pkg)}
                        </span>
                        <span className="text-[12px] text-slate">{relativeTime(pkg.created_at)}</span>
                      </span>
                      <Pill variant={pkg.status}>{STATUS_LABEL[pkg.status]}</Pill>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </Reveal>

          {/* New "Planned" row — LockedTile, per PLANNED_SERVICES.md */}
          <Reveal delay={140}>
            <section className="flex flex-col gap-3">
              <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate">
                Planned for you
              </div>
              {/* Horizontally-scrollable strip on mobile; static grid on larger */}
              <div className="flex snap-x gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible">
                {PLANNED_SERVICES.map((s) => (
                  <LockedTile
                    key={s.title}
                    title={s.title}
                    description={s.description}
                    note={`${s.title} — planned for a future release.`}
                    tone="light"
                    className="min-w-[240px] snap-start lg:min-w-0"
                  />
                ))}
              </div>
            </section>
          </Reveal>
        </div>

        {/* ── RIGHT rail ── */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* Readiness ring card */}
          <Reveal delay={170}>
            <div className="border border-edge bg-white flex flex-col gap-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate">
                    Profile Strength
                  </span>
                  <span className="text-[13px] text-slate">
                    {missing.length === 0 && profile
                      ? 'Every section complete'
                      : `${missing.length} item${missing.length === 1 ? '' : 's'} still needed`}
                  </span>
                </div>
                <ReadinessRing score={score} size={64} dark />
              </div>

              <ProgressBar value={score} tone="light" getValueLabel={(v) => `${v} out of 100`} />

              {missing.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {missing.slice(0, 6).map((m) => (
                    <Link
                      key={m.field}
                      href="/profile"
                      className="rounded-full border border-edge bg-paper px-3 py-1.5 text-[12px] font-medium text-slate transition-colors hover:border-signal/50 hover:text-signal-ink"
                    >
                      {m.label}
                    </Link>
                  ))}
                </div>
              ) : null}

              <Link
                href="/profile"
                className={cn(buttonVariants({ variant: 'primary' }), 'mt-1 w-full text-[14px]')}
              >
                {missing.length === 0 ? 'View Career Profile' : 'Improve Score'}
              </Link>
            </div>
          </Reveal>

          {/* Gulf Readiness — the arithmetic market score, moved here from the
              Career Profile (founder decision 2026-08-18). Distinct from Profile
              Strength above: this is "how ready for the Gulf market", that is "how
              complete your profile is". Rendered only when a profile exists. */}
          {gulfAnswers && profile ? (
            <Reveal delay={185}>
              <LiveReadiness
                answers={gulfAnswers}
                profile={{
                  professional_summary: profile.professional_summary,
                  phone: profile.phone,
                  email: profile.email,
                  work_experience: profile.work_experience.map((w) => ({
                    company: w.company,
                    role: w.role,
                    start_date: w.start_date,
                    end_date: w.end_date,
                    location: w.location,
                    description: w.description,
                    highlights: w.highlights,
                  })),
                  skills: profile.skills.map((s) => ({ name: s.name })),
                  certifications: profile.certifications.map((c) => ({ name: c.name, issuer: c.issuer })),
                  education: profile.education.map((e) => ({
                    degree: e.degree,
                    institution: e.institution,
                    field_of_study: e.field_of_study,
                  })),
                }}
              />
            </Reveal>
          ) : null}

          {/* Quick Actions */}
          <Reveal delay={200}>
            <div className="border border-edge bg-white flex flex-col gap-2 p-6">
              <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate">
                Quick actions
              </div>
              <div className="mt-1 flex flex-col">
                {QUICK_ACTIONS.map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-bp px-2 py-2.5 text-[14px] font-semibold text-graphite transition-colors hover:bg-paper hover:text-signal-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                  >
                    {a.label}
                    <span aria-hidden className="text-slate">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Library preview */}
          <Reveal delay={230}>
            <div className="border border-edge bg-white flex h-full flex-col gap-4 p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate">
                  Library · {packagesLoaded ? packageCount : '—'} package{packageCount === 1 ? '' : 's'}
                </span>
                <Link
                  href="/dashboard/library"
                  className="text-[12px] font-semibold text-signal transition-colors hover:text-signal/80"
                >
                  View Library →
                </Link>
              </div>
              {packageCount === 0 ? (
                <div className="flex flex-1 items-center rounded-bp border border-dashed border-edge bg-paper p-5 text-[13px] leading-relaxed text-slate">
                  No packages yet — optimize a resume and it will appear here.
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-2">
                  {recentPackages.slice(0, 3).map((pkg) => (
                    <div
                      key={pkg.id}
                      className="flex items-center justify-between rounded-bp bg-paper px-4 py-2.5 text-[13px] font-medium text-graphite"
                    >
                      <span>
                        {resumeLabel(pkg)} ·{' '}
                        {GULF_COUNTRIES.find((c) => c.value === pkg.target_country)?.label ?? pkg.target_country}
                      </span>
                      <span className="text-[12px] text-slate">v{pkg.generation_count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    fresher: 'Fresher',
    experienced_not_in_gulf: 'Experienced',
    returner: 'Returning',
    currently_in_gulf: 'In the Gulf',
  }
  return map[category] ?? category
}

/**
 * A dashboard metric. When given an `href` the whole tile is the link.
 *
 * A number the user is meant to act on should be reachable from where it is
 * shown — reading "Profile Strength 62%" and then hunting the menu for where
 * to fix it is the sort of small friction that makes a product feel unfinished.
 * The whole card is the target rather than a small "view" link, which is both
 * easier to hit on a phone and simpler to announce to a screen reader.
 */
function MetricTile({
  label,
  value,
  sub,
  muted,
  href,
}: {
  label: string
  value?: string
  sub?: string
  muted?: boolean
  href?: string
}) {
  // Blueprint: a figure and its label, with no container. The mono face and
  // tabular figures are the point — a number that changes must not shift the
  // ones beside it.
  const inner = (
    <>
      <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate">
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-[28px] font-medium leading-none tracking-[-0.02em] tabular-nums',
          muted ? 'text-slate' : 'text-graphite',
        )}
      >
        {value}
      </span>
      {sub ? <span className="text-[12px] text-slate">{sub}</span> : null}
    </>
  )

  if (!href) {
    return <div className="flex flex-1 flex-col gap-1.5 py-4 pr-4 first:pl-0 [&:not(:first-child)]:pl-4">{inner}</div>
  }

  return (
    <Link
      href={href}
      aria-label={`${label}: ${value ?? 'not available'}`}
      className="group flex flex-1 flex-col gap-1.5 py-4 pr-4 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 [&:not(:first-child)]:pl-4"
    >
      {inner}
    </Link>
  )
}
