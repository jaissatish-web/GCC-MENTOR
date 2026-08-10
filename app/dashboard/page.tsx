'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReadinessRing from '@/components/ui/ReadinessRing'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Reveal } from '@/components/ui/Reveal'
import { buttonVariants } from '@/components/ui/Button'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { calculateReadiness } from '@/lib/readiness'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { Package } from '@/types/package'

/**
 * Dashboard — screens D1/D2 (TASK-034), route /dashboard.
 * Dark premium redesign, Phase 1 (2026-08-07) of the app-shell visual pass.
 *
 * VISUAL-ONLY CHANGE. Every data source is identical to the previous
 * version: GET /api/profile, GET /api/packages, calculateReadiness() — same
 * calls, same fields, same logic. The only functional addition is that the
 * packages fetch now keeps the array (previously only .length was kept),
 * because Recent Activity and the metric row need the real rows — not new
 * data, just more of what was already being fetched.
 *
 * New sections, and exactly what backs each one:
 *  - Top metric row: Profile Strength (readiness_score, real) · Resumes
 *    Created (packages.length, real) · Interviews Practiced / Jobs Matched
 *    (NOT built — rendered as a locked "Coming soon" tile, never a fake
 *    number, per the phase brief).
 *  - Gulf Readiness Score card: same ReadinessRing + calculateReadiness()
 *    as before, dark variant. The "breakdown" is the real `missing` list
 *    from calculateReadiness — no per-category sub-scores are invented;
 *    the scoring algorithm itself is untouched.
 *  - Next Best Action: three-tier rule from real state (no profile / no
 *    packages / has packages) — not a recommendation engine, just an
 *    if/else on data already on the page.
 *  - Recent Activity: the 3 newest packages, real target_job_title +
 *    created_at + status. Empty state (not fake rows) when there are none.
 *  - Services grid: UNCHANGED from before — same LOCKED array, same
 *    showLocked() interaction (click → "coming in Phase N" note), just
 *    restyled. TASK-004's rule still applies: no nav entries for these.
 *  - Library preview: same packageCount-based summary, restyled, now also
 *    lists the same 3 recent packages instead of just a count string.
 */

type LockedService = 'ats' | 'cover' | 'qa' | 'mock'

const LOCKED: ReadonlyArray<{
  key: LockedService
  title: string
  icon: string
  badge: string
  phase: string
}> = [
  { key: 'ats', title: 'ATS score check', icon: '◑', badge: 'Free · Phase 2', phase: '2' },
  { key: 'cover', title: 'Cover letter', icon: '✎', badge: 'Phase 3', phase: '3' },
  { key: 'qa', title: 'Interview Q&A study', icon: '?', badge: 'Phase 4', phase: '4' },
  { key: 'mock', title: 'Mock interview', icon: '◉', badge: 'Phase 4', phase: '4' },
]

// Two metrics genuinely have no backing feature yet — Interviews Practiced
// needs Mock Interview (Phase 4), Jobs Matched needs a job-matching engine
// that isn't scoped at all. Rendered as locked tiles, never a fabricated 0
// or invented number.
const UNBUILT_METRICS: ReadonlyArray<{ label: string; needs: string }> = [
  { label: 'Interviews Practiced', needs: 'Mock Interview' },
  { label: 'Jobs Matched', needs: 'Job matching' },
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

export default function DashboardPage() {
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [packagesLoaded, setPackagesLoaded] = useState(false)
  const [lockedNote, setLockedNote] = useState<string | null>(null)
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
    // the count, so Recent Activity and the metric row can use real data.
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

  const showLocked = useCallback((svc: (typeof LOCKED)[number]) => {
    setLockedNote(`${svc.title} — coming in Phase ${svc.phase}.`)
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

  // Next Best Action — a simple three-tier rule over real state, not a
  // recommendation engine (explicitly out of scope for this phase).
  const nextAction =
    !profile || score < 40
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
    <div className="flex flex-col gap-6 p-5 pb-8 sm:p-8 lg:p-10">
      {/* ── Header ── */}
      <Reveal>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-[28px] leading-tight text-marble sm:text-[32px]">
              Good {greeting()}, {firstName} <span aria-hidden>👋</span>
            </h1>
            <p className="text-[13px] text-marble/50">
              {targetParts ? `Targeting ${targetParts}` : "Let's get you closer to your next opportunity."}
            </p>
          </div>
          <Link
            href="/profile"
            aria-label="Profile readiness"
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-void"
          >
            <ReadinessRing score={score} size={52} dark />
          </Link>
        </div>
      </Reveal>

      {/* ── Top metric row ── */}
      <Reveal delay={40}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricTile label="Profile Strength" value={`${score}%`} sub={readiness?.category ? categoryLabel(readiness.category) : undefined} />
          <MetricTile
            label="Resumes Created"
            value={packagesLoaded ? String(packageCount) : '—'}
            sub={packageCount > 0 ? 'In your Library' : undefined}
          />
          {UNBUILT_METRICS.map((m) => (
            <MetricTile key={m.label} label={m.label} locked lockedNote={`Needs ${m.needs}`} />
          ))}
        </div>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* ── Gulf Readiness Score ── */}
        <Reveal delay={80}>
          <Card tone="dark" className="flex flex-col gap-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-marble/40">
                  Gulf Readiness Score
                </span>
                <span className="text-[13px] text-marble/55">
                  {missing.length === 0 && profile
                    ? 'Every section complete'
                    : `${missing.length} item${missing.length === 1 ? '' : 's'} still needed`}
                </span>
              </div>
              <ReadinessRing score={score} size={64} dark />
            </div>

            <ProgressBar value={score} tone="dark" getValueLabel={(v) => `${v} out of 100`} />

            {missing.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {missing.slice(0, 6).map((m) => (
                  <Link
                    key={m.field}
                    href="/profile"
                    className="rounded-full border border-hairline bg-void/50 px-3 py-1.5 text-[11.5px] font-medium text-marble/60 transition-colors hover:border-gold/40 hover:text-gold-light"
                  >
                    {m.label}
                  </Link>
                ))}
              </div>
            ) : null}

            <Link
              href="/profile"
              className={buttonVariants({ variant: 'purchase', className: 'mt-1 w-full text-[13.5px]' })}
            >
              {missing.length === 0 ? 'View Career Profile' : 'Improve Score'}
            </Link>
          </Card>
        </Reveal>

        {/* ── Next Best Action ── */}
        <Reveal delay={110}>
          <Card tone="dark" className="flex h-full flex-col justify-between gap-5 border-gold/25 bg-gold/[0.06] p-6">
            <div className="flex flex-col gap-2">
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-gold">
                Your next best action
              </span>
              <h2 className="font-serif text-[22px] leading-snug text-marble">{nextAction.title}</h2>
              <p className="text-[13.5px] leading-relaxed text-marble/60">{nextAction.body}</p>
            </div>
            <Link
              href={nextAction.href}
              className={buttonVariants({ variant: 'purchase', className: 'w-fit text-[13.5px]' })}
            >
              {nextAction.cta} →
            </Link>
          </Card>
        </Reveal>
      </div>

      {/* ── Services grid — unchanged behavior, restyled ── */}
      <Reveal delay={140}>
        <section className="flex flex-col gap-3">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-marble/40">
            Services
          </div>

          {lockedNote ? (
            <div className="rounded-xl border border-gold/25 bg-gold/10 px-4 py-3 text-[12.5px] text-gold-light">
              {lockedNote}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Live — primary CTA */}
            <Link
              href="/optimize/target"
              className={cn(
                'flex min-h-[92px] items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/[0.08] p-5 text-left shadow-glow-gold transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-void motion-reduce:transition-none motion-reduce:transform-none',
                'sm:col-span-2 lg:col-span-1'
              )}
            >
              <span className="flex flex-col gap-1">
                <span className="text-[15px] font-bold leading-tight text-marble">
                  Optimize resume for a job
                </span>
                <span className="text-[11.5px] text-marble/50">About 2 minutes</span>
              </span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold text-[18px] font-bold text-midnight">
                +
              </span>
            </Link>

            {/* Locked services */}
            {LOCKED.map((svc) => (
              <button
                key={svc.key}
                type="button"
                onClick={() => showLocked(svc)}
                aria-label={`${svc.title}, coming in Phase ${svc.phase}`}
                className="flex min-h-[92px] flex-col gap-2 rounded-2xl border border-dashed border-hairline bg-surface/60 p-4 text-left transition-colors hover:border-gold/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-void"
              >
                <span className="text-[15px] text-marble/50">{svc.icon}</span>
                <span className="text-[13px] font-bold leading-tight text-marble/80">{svc.title}</span>
                <span className="mt-auto w-fit rounded-full border border-hairline bg-void/60 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-marble/40">
                  {svc.badge}
                </span>
              </button>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ── Recent Activity + Library preview ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal delay={170}>
          <Card tone="dark" className="flex h-full flex-col gap-3 p-6">
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-marble/40">
              Recent activity
            </div>
            {!packagesLoaded ? (
              <div className="flex flex-col gap-2">
                <div className="h-14 animate-pulse rounded-xl bg-surface-2/50" />
                <div className="h-14 animate-pulse rounded-xl bg-surface-2/50" />
              </div>
            ) : recentPackages.length === 0 ? (
              <div className="flex flex-col gap-1 rounded-xl border border-dashed border-hairline bg-void/40 p-5">
                <span className="text-[13px] font-semibold text-marble/60">No activity yet</span>
                <span className="text-[12.5px] leading-relaxed text-marble/40">
                  Optimize a resume and it will show up here.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentPackages.map((pkg) => (
                  <Link
                    key={pkg.id}
                    href={`/package/${pkg.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-hairline/70 bg-void/40 px-4 py-3 transition-colors hover:border-gold/30"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-marble/85">
                        Optimized for {pkg.target_job_title}
                      </span>
                      <span className="text-[11.5px] text-marble/40">{relativeTime(pkg.created_at)}</span>
                    </span>
                    <Pill variant={pkg.status}>{STATUS_LABEL[pkg.status]}</Pill>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </Reveal>

        <Reveal delay={190}>
          <Card tone="dark" className="flex h-full flex-col gap-4 p-6">
            <div className="flex items-baseline justify-between">
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-marble/40">
                Library · {packagesLoaded ? packageCount : '—'} package{packageCount === 1 ? '' : 's'}
              </span>
              <Link
                href="/dashboard/library"
                className="text-[12px] font-semibold text-state-emerald-line transition-colors hover:text-emerald"
              >
                View Library →
              </Link>
            </div>
            {packageCount === 0 ? (
              <div className="flex flex-1 items-center rounded-xl border border-dashed border-hairline bg-void/40 p-5 text-[12.5px] leading-relaxed text-marble/45">
                No packages yet — optimize a resume and it will appear here.
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-2">
                {recentPackages.slice(0, 3).map((pkg) => (
                  <div
                    key={pkg.id}
                    className="flex items-center justify-between rounded-xl bg-void/40 px-4 py-2.5 text-[13px] font-medium text-marble/75"
                  >
                    <span>
                      {pkg.target_job_title} ·{' '}
                      {GULF_COUNTRIES.find((c) => c.value === pkg.target_country)?.label ?? pkg.target_country}
                    </span>
                    <span className="text-[11px] text-marble/35">v{pkg.generation_count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Reveal>
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
  locked,
  lockedNote,
}: {
  label: string
  value?: string
  sub?: string
  locked?: boolean
  lockedNote?: string
}) {
  return (
    <Card
      tone="dark"
      className={cn('flex flex-col gap-1.5 p-4', locked && 'border-dashed bg-surface/50')}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-marble/40">
        {label}
      </span>
      {locked ? (
        <>
          <span className="font-mono text-[22px] text-marble/25">—</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-marble/30">
            {lockedNote ?? 'Coming soon'}
          </span>
        </>
      ) : (
        <>
          <span className="font-mono text-[26px] leading-none text-gold-light">{value}</span>
          {sub ? <span className="text-[11px] text-state-emerald-line">{sub}</span> : null}
        </>
      )}
    </Card>
  )
}
