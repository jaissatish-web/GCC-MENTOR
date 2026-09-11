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
import { EmptyState } from '@/components/ui/EmptyState'
import { BriefcaseIcon, ChartBarIcon, DocumentTextIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { cn, GULF_COUNTRIES, resumeLabel } from '@/lib/utils'
import { calculateReadiness } from '@/lib/readiness'
import { computeNextAction } from '@/lib/nextAction'
import { answersFromReadinessCategory, scoringInputFromProfile } from '@/lib/gulfReadiness/fromProfile'
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

// Each action carries its service's icon and tint, so the list can be scanned
// by shape and colour instead of read line by line. Tints are literal strings
// because Tailwind only emits classes it can see whole in the source.
const QUICK_ACTIONS: ReadonlyArray<{
  label: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  tint: string
}> = [
  { label: 'Check profile strength', href: '/profile', icon: ChartBarIcon, tint: 'bg-teal-soft text-teal' },
  { label: 'Optimize my CV for a job', href: '/optimize/target', icon: DocumentTextIcon, tint: 'bg-gold-soft text-gold-ink' },
  { label: 'Write a cover letter', href: '/cover-letter', icon: EnvelopeIcon, tint: 'bg-sec-summary/10 text-sec-summary' },
  { label: 'Open my Resume Library', href: '/dashboard/library', icon: BriefcaseIcon, tint: 'bg-ok-soft text-ok' },
]

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

  // No name, no "Good evening, there" — a greeting to nobody reads as a bug.
  const firstName = profile ? profile.full_name.trim().split(/\s+/)[0] : ''
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

  // Next best action — one action, chosen from real state.
  //
  // The three-tier ternary that stood here could not see a half-finished job:
  // a user who set one up and stopped was told to "optimize your next
  // application", with no route back to the one they had already started. The
  // rules moved to lib/nextAction.ts, which reads only what these same two
  // fetches already returned.
  const nextAction = computeNextAction(profile, packages, score, missing.length)

  return (
    // BLUEPRINT (2026-09-08). Ground is `paper`, not white: the surfaces that
    // matter then sit on top of it as white, which is what gives the screen a
    // figure/ground relationship instead of a single flat sheet.
    <div className="flex min-h-full flex-col gap-6 bg-canvas p-4 pb-8 font-redesign-sans sm:p-7 lg:p-9">
      {/* First-run nudge to build the Career Profile — shown only once we KNOW
          there is no profile yet. Dismissible; the dashboard's own CTA persists. */}
      <ProfileKickstart show={profileLoaded && profile === null} />

      {/* ── Header: greeting + readiness ring ── */}
      <Reveal>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            {/* Archivo, not the serif. Blueprint's voice is an instrument
                label: tight tracking, real weight, no flourish. */}
            <h1 className="font-display text-[24px] font-bold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[30px]">
              {/* While the profile is still loading, a plain greeting — not
                  "Welcome to GCC MENTOR", which flashed at returning users for
                  the second before their name arrived. */}
              {firstName
                ? `Good ${greeting()}, ${firstName}`
                : profileLoaded
                  ? 'Welcome to GCC MENTOR'
                  : `Good ${greeting()}`}
            </h1>
            <p className="text-[13px] text-ink-muted">
              {targetParts ? `Targeting ${targetParts}` : "Let's get you closer to your next opportunity."}
            </p>
          </div>
          <Link
            href="/profile"
            aria-label="Profile readiness"
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-teal"
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
            <div className="grid grid-cols-2 gap-3">
              <MetricTile
                label="Profile strength"
                icon={ChartBarIcon}
                accent="teal"
                value={profile ? `${score}%` : '—'}
                sub={
                  !profileLoaded
                    ? undefined
                    : profile
                      ? readiness?.category ? categoryLabel(readiness.category) : undefined
                      : 'Not started'
                }
                href="/profile"
              />
              <MetricTile
                label="Resume Library"
                icon={BriefcaseIcon}
                accent="gold"
                value={packagesLoaded ? String(packageCount) : '—'}
                sub={packageCount > 0 ? 'Open the pipeline' : 'None yet'}
                href="/dashboard/library"
              />
            </div>
          </Reveal>

          {/* Next-step hero strip */}
          <Reveal delay={80}>
            {/* THE SIGNATURE ELEMENT of the Meridian dashboard, and the one
                place gold is spent on this screen.

                Teal is the brand and gold is the action, so the card that
                carries the single next step is the one place they meet: a
                solid teal panel with one gold button on it. Blueprint made
                this a white panel with an orange left rule, which said "this
                is a section" rather than "this is the thing to do".

                Ink on gold measures 6.70 and white on teal 9.84 — the two
                pairs this panel depends on. Gold is never text here; the
                label above the heading is a light teal tint, not gold, for
                exactly that reason. */}
            <div className="flex h-full flex-col justify-between gap-5 rounded-card bg-teal p-5 shadow-m-2 sm:p-6">
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-soft">
                  Your next step
                </span>
                <h2 className="font-display text-[20px] font-semibold leading-snug tracking-[-0.01em] text-white sm:text-[23px]">
                  {nextAction.title}
                </h2>
                <p className="text-[14px] leading-relaxed text-teal-soft/90">{nextAction.body}</p>
              </div>
              <Link
                href={nextAction.href}
                className="inline-flex w-full items-center justify-center rounded-ctl bg-gold px-5 py-3.5 text-[14px] font-bold text-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal sm:w-fit"
              >
                {nextAction.cta}
              </Link>
            </div>
          </Reveal>

          {/* ── Your target jobs ── */}
          <Reveal delay={110}>
            {/* WAS "RECENT ACTIVITY", whose rows read "Optimized for <role>" —
                the event, not the thing. A row here is a job the user is going
                for, so it says the role, the employer and where it stands. The
                three rows the right rail used to repeat are gone; showing the
                same three packages twice on one screen made the dashboard look
                fuller than it was.

                A LIST, NOT A CARD OF CARDS. This was a bordered panel whose
                rows were themselves bordered panels — two containers to say
                one thing. */}
            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Your Resume Library
                </span>
                {packageCount > 0 ? (
                  <Link
                    href="/dashboard/library"
                    // 44px tall: it measured 18px — a thumb-sized miss.
                    className="-my-3 inline-flex min-h-11 items-center px-1 text-[12.5px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    See all {packageCount} →
                  </Link>
                ) : null}
              </div>
              {!packagesLoaded ? (
                <div className="flex flex-col divide-y divide-line border-y border-line bg-white">
                  <div className="h-14 animate-pulse bg-canvas/70" />
                  <div className="h-14 animate-pulse bg-canvas/70" />
                </div>
              ) : recentPackages.length === 0 ? (
                <EmptyState
                  tone="inline"
                  icon={BriefcaseIcon}
                  title="No target jobs yet"
                  body="Each job you apply for keeps its own CV, cover letter and stage together here."
                />
              ) : (
                <div className="flex flex-col divide-y divide-line border-y border-line bg-white">
                  {recentPackages.map((pkg) => (
                    <Link
                      key={pkg.id}
                      href={`/package/${pkg.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-display text-[14px] font-semibold text-ink">
                          {resumeLabel(pkg)}
                        </span>
                        {/* Employer and country only when the user gave them —
                            `target_company` and `target_country` are both
                            nullable, and "· generic_gulf" is our enum leaking
                            onto their dashboard. */}
                        <span className="truncate text-[12px] text-ink-muted">
                          {[pkg.target_company, dashboardCountryLabel(pkg.target_country)]
                            .filter(Boolean)
                            .join(' · ') || relativeTime(pkg.created_at)}
                        </span>
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
              <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
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
            <div className="flex flex-col gap-5 rounded-card border border-line bg-white p-6 shadow-m-1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Profile Strength
                  </span>
                  {/* With no profile, `missing` is empty because nothing was
                      checked — it printed "0 items still needed" beside a 0%
                      ring. Same false-complete as /gcc-readiness had. */}
                  <span className="text-[13px] text-ink-soft">
                    {!profile
                      ? 'Not started — upload your CV to begin'
                      : missing.length === 0
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
                      className="rounded-full border border-line bg-canvas px-3 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:border-teal/50 hover:text-teal"
                    >
                      {m.label}
                    </Link>
                  ))}
                </div>
              ) : null}

              {/* Secondary, not gold: the next-step panel above already holds
                  this screen's one gold action, and two gold buttons stacked a
                  scroll apart compete for the same thumb. */}
              <Link
                href={profile ? '/profile' : '/profile?import=upload'}
                className={cn(buttonVariants({ variant: 'secondary' }), 'mt-1 w-full text-[14px]')}
              >
                {!profile ? 'Build my profile' : missing.length === 0 ? 'View Career Profile' : 'Improve my score'}
              </Link>
            </div>
          </Reveal>

          {/* Gulf Readiness — the arithmetic market score, moved here from the
              Career Profile (founder decision 2026-08-18). Distinct from Profile
              Strength above: this is "how ready for the Gulf market", that is "how
              complete your profile is". Rendered only when a profile exists. */}
          {gulfAnswers && profile ? (
            <Reveal delay={185}>
              {/* The mapping is shared, so this card and the Career Profile's
                  Improve panel read the same facts through the same engine. */}
              <LiveReadiness
                answers={gulfAnswers}
                profile={scoringInputFromProfile(profile)}
                detailsHref="/profile?improve=gulf"
              />
            </Reveal>
          ) : null}

          {/* Quick Actions */}
          <Reveal delay={200}>
            <div className="flex flex-col gap-2 rounded-card border border-line bg-white p-5 shadow-m-1">
              <div className="px-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Quick actions
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {QUICK_ACTIONS.map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="group flex min-h-12 items-center gap-3 rounded-ctl px-2 py-2 text-[14px] font-semibold text-ink transition-colors hover:bg-canvas hover:text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    <span aria-hidden="true" className={cn('flex size-9 shrink-0 items-center justify-center rounded-ctl', a.tint)}>
                      <a.icon className="size-[18px]" />
                    </span>
                    <span className="flex-1">{a.label}</span>
                    <span aria-hidden className="text-ink-muted transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                ))}
              </div>
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
  href,
  icon: Icon,
  accent,
}: {
  label: string
  value?: string
  sub?: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  accent: 'teal' | 'gold'
}) {
  // WAS two mono numbers with grey caps above them and no container — the
  // founder's "black and white" in its purest form. Each figure now sits in a
  // small card with its service's icon and colour, so the row reads as two
  // things you can tap, not two lines of a spreadsheet. Tabular figures stay:
  // a number that changes must not shift its neighbours.
  //   teal on teal-soft 8.30 · gold-ink on gold-soft 4.83
  return (
    <Link
      href={href}
      aria-label={`${label}: ${value ?? 'not available'}`}
      className="group flex min-w-0 flex-col gap-2.5 rounded-card border border-line bg-white p-4 shadow-m-1 transition-all hover:-translate-y-px hover:shadow-m-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 motion-reduce:transform-none"
    >
      {/* Icon above the label, not beside it: side by side, a 375px phone
          cut both labels to "PROFILE ST…" and "TARGET JO…". */}
      <span
        aria-hidden="true"
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-ctl',
          accent === 'teal' ? 'bg-teal-soft text-teal' : 'bg-gold-soft text-gold-ink',
        )}
      >
        <Icon className="size-[17px]" />
      </span>
      <span className="text-[12.5px] font-semibold leading-tight text-ink-soft">{label}</span>
      <span
        className={cn(
          'font-display text-[30px] font-bold leading-none tracking-[-0.02em] tabular-nums',
          accent === 'teal' ? 'text-teal' : 'text-gold-ink',
        )}
      >
        {value}
      </span>
      {sub ? <span className="text-[12px] text-ink-soft">{sub}</span> : null}
    </Link>
  )
}
