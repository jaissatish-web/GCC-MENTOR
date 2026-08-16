'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import ReadinessRing from '@/components/ui/ReadinessRing'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { LockedTile } from '@/components/ui/LockedTile'
import { Reveal } from '@/components/ui/Reveal'
import { buttonVariants } from '@/components/ui/Button'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { calculateReadiness } from '@/lib/readiness'
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
 * Resumes Created, Latest Job Match) + next-step hero strip + Recent
 * Activity + new "Planned" row (LockedTile); right rail (≥1280px) = Readiness
 * ring card, Quick Actions list, Library preview. On tablet the rail drops
 * below the main column; metric row 2-up; on mobile the Planned row is a
 * horizontally-scrollable strip.
 *
 * Two approved corrections, not scope creep:
 *  (1) the stale "ATS score check" locked tile is DROPPED (the scanner has
 *      been live since TASK-058) — it no longer appears anywhere.
 *  (2) a third metric tile, "Latest Job Match," is added, sourced from the
 *      most recent package's already-computed JobMatchResult
 *      (`ats_score_card.job_match`, returned by the existing
 *      `GET /api/packages` `.select('*')` — display-only, no computation).
 *      `ats_score_card` is a Phase-2 reservation slot, so when no Job Match
 *      has been computed yet the tile renders a neutral "No match yet"
 *      state, never a fabricated number.
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
  { label: 'Analyze a Job Match', href: '/job-match' },
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
function latestJobMatch(packages: Package[]): { score: number; title?: string } | null {
  for (const p of packages) {
    const ats = p.ats_score_card
    if (ats && typeof ats === 'object' && !Array.isArray(ats)) {
      const jm = (ats as { job_match?: unknown }).job_match
      if (jm && typeof jm === 'object') {
        const score = (jm as { match_score?: unknown }).match_score
        if (typeof score === 'number' && Number.isFinite(score)) {
          // job_match (lib/ai/atsScorePrompt.ts's AtsScoreResult) has no
          // title field of its own — the package row it's stored on
          // already has the real target_job_title.
          return { score, title: p.target_job_title || undefined }
        }
      }
    }
  }
  return null
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
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
    // Same /api/packages call as before — now keeping the rows, not just
    // the count, so Recent Activity, the metric row and "Latest Job Match"
    // can use real data.
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
  const packageCount = packages.length
  const recentPackages = packages.slice(0, 3)
  const jobMatch = latestJobMatch(packages)

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
          href: '/create-resume',
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
    <div className="flex flex-col gap-6 p-5 pb-8 sm:p-8 lg:p-10 font-redesign-sans">
      {/* ── Header: greeting + readiness ring ── */}
      <Reveal>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-[28px] leading-tight text-ink-900 sm:text-[32px]">
              Good {greeting()}, {firstName} <span aria-hidden>👋</span>
            </h1>
            <p className="text-[13px] text-ink-400">
              {targetParts ? `Targeting ${targetParts}` : "Let's get you closer to your next opportunity."}
            </p>
          </div>
          <Link
            href="/profile"
            aria-label="Profile readiness"
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2 focus-visible:ring-offset-forest-deep"
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
          {/* Metric row: Profile Strength · Resumes Created · Latest Job Match */}
          <Reveal delay={40}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricTile label="Profile Strength" value={`${score}%`} sub={readiness?.category ? categoryLabel(readiness.category) : undefined} />
              <MetricTile
                label="Resumes Created"
                value={packagesLoaded ? String(packageCount) : '—'}
                sub={packageCount > 0 ? 'In your Library' : undefined}
              />
              <MetricTile
                label="Latest Job Match"
                value={jobMatch ? `${jobMatch.score}%` : '—'}
                sub={jobMatch?.title ?? (jobMatch ? 'Match score' : 'No match yet')}
                muted={!jobMatch}
              />
            </div>
          </Reveal>

          {/* Next-step hero strip */}
          <Reveal delay={80}>
            <Card tone="light" className="flex h-full flex-col justify-between gap-5 border-redesign-gold/25 bg-redesign-gold/[0.06] p-6">
              <div className="flex flex-col gap-2">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-gold-text">
                  Your next best action
                </span>
                <h2 className="font-serif text-[22px] leading-snug text-ink-900">{nextAction.title}</h2>
                <p className="text-[13.5px] leading-relaxed text-ink-400">{nextAction.body}</p>
              </div>
              <Link
                href={nextAction.href}
                className={cn(buttonVariants({ variant: 'primary' }), 'w-fit text-[13.5px]')}
              >
                {nextAction.cta} →
              </Link>
            </Card>
          </Reveal>

          {/* Recent Activity */}
          <Reveal delay={110}>
            <Card tone="light" className="flex h-full flex-col gap-3 p-6">
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                Recent activity
              </div>
              {!packagesLoaded ? (
                <div className="flex flex-col gap-2">
                  <div className="h-14 animate-pulse rounded-radius-md bg-surface-2-light/60" />
                  <div className="h-14 animate-pulse rounded-radius-md bg-surface-2-light/60" />
                </div>
              ) : recentPackages.length === 0 ? (
                <div className="flex flex-col gap-1 rounded-radius-md border border-dashed border-line-light bg-surface-2-light/50 p-5">
                  <span className="text-[13px] font-semibold text-ink-400">No activity yet</span>
                  <span className="text-[12.5px] leading-relaxed text-ink-400">
                    Optimize a resume and it will show up here.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentPackages.map((pkg) => (
                    <Link
                      key={pkg.id}
                      href={`/package/${pkg.id}`}
                      className="flex items-center justify-between gap-3 rounded-radius-md border border-line-light/70 bg-surface-2-light/50 px-4 py-3 transition-colors hover:border-redesign-gold/40"
                    >
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-semibold text-ink-900/85">
                          Optimized for {pkg.target_job_title}
                        </span>
                        <span className="text-[11.5px] text-ink-400">{relativeTime(pkg.created_at)}</span>
                      </span>
                      <Pill variant={pkg.status}>{STATUS_LABEL[pkg.status]}</Pill>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </Reveal>

          {/* New "Planned" row — LockedTile, per PLANNED_SERVICES.md */}
          <Reveal delay={140}>
            <section className="flex flex-col gap-3">
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
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
            <Card tone="light" className="flex flex-col gap-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                    Profile Strength
                  </span>
                  <span className="text-[13px] text-ink-400">
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
                      className="rounded-full border border-line-light bg-surface-2-light/60 px-3 py-1.5 text-[11.5px] font-medium text-ink-400 transition-colors hover:border-redesign-gold/40 hover:text-gold-text"
                    >
                      {m.label}
                    </Link>
                  ))}
                </div>
              ) : null}

              <Link
                href="/profile"
                className={cn(buttonVariants({ variant: 'primary' }), 'mt-1 w-full text-[13.5px]')}
              >
                {missing.length === 0 ? 'View Career Profile' : 'Improve Score'}
              </Link>
            </Card>
          </Reveal>

          {/* Quick Actions */}
          <Reveal delay={200}>
            <Card tone="light" className="flex flex-col gap-2 p-6">
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                Quick actions
              </div>
              <div className="mt-1 flex flex-col">
                {QUICK_ACTIONS.map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-radius-md px-2 py-2.5 text-[13.5px] font-semibold text-ink-900/85 transition-colors hover:bg-surface-2-light/60 hover:text-gold-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold"
                  >
                    {a.label}
                    <span aria-hidden className="text-ink-400">→</span>
                  </Link>
                ))}
              </div>
            </Card>
          </Reveal>

          {/* Library preview */}
          <Reveal delay={230}>
            <Card tone="light" className="flex h-full flex-col gap-4 p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Library · {packagesLoaded ? packageCount : '—'} package{packageCount === 1 ? '' : 's'}
                </span>
                <Link
                  href="/dashboard/library"
                  className="text-[12px] font-semibold text-forest transition-colors hover:text-forest/80"
                >
                  View Library →
                </Link>
              </div>
              {packageCount === 0 ? (
                <div className="flex flex-1 items-center rounded-radius-md border border-dashed border-line-light bg-surface-2-light/50 p-5 text-[12.5px] leading-relaxed text-ink-400">
                  No packages yet — optimize a resume and it will appear here.
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-2">
                  {recentPackages.slice(0, 3).map((pkg) => (
                    <div
                      key={pkg.id}
                      className="flex items-center justify-between rounded-radius-md bg-surface-2-light/50 px-4 py-2.5 text-[13px] font-medium text-ink-900/75"
                    >
                      <span>
                        {pkg.target_job_title} ·{' '}
                        {GULF_COUNTRIES.find((c) => c.value === pkg.target_country)?.label ?? pkg.target_country}
                      </span>
                      <span className="text-[11px] text-ink-400">v{pkg.generation_count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
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

function MetricTile({
  label,
  value,
  sub,
  muted,
}: {
  label: string
  value?: string
  sub?: string
  muted?: boolean
}) {
  return (
    <Card tone="light" className="flex flex-col gap-1.5 p-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
        {label}
      </span>
      <span className={cn('font-mono text-[26px] leading-none', muted ? 'text-ink-400' : 'text-gold-text')}>
        {value}
      </span>
      {sub ? <span className={cn('text-[11px]', muted ? 'text-ink-400' : 'text-forest')}>{sub}</span> : null}
    </Card>
  )
}
