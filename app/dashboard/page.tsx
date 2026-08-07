'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReadinessRing from '@/components/ui/ReadinessRing'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { calculateReadiness } from '@/lib/readiness'
import type { CareerProfileFull } from '@/types/careerProfile'

/**
 * Dashboard — screens D1/D2 (TASK-034), route /dashboard.
 *
 * Service grid FIRST, Library preview SECOND (the compact "Library · N packages"
 * + "See all" link — the full Library UI is TASK-035's /dashboard/library page,
 * not re-implemented here). Mirrors design-reference screens D1 (mobile) and D2
 * (desktop): service cards in the same order/copy/badges, the readiness ring in
 * the header, a Career Profile entry point showing items remaining, and the
 * personalization touches from docs/DASHBOARD_LIBRARY.md §9 (name + target line).
 *
 * Service grid: "Optimize resume for a job" is the only LIVE service (navy,
 * primary CTA → /optimize/target). ATS / Cover letter / Interview Q&A / Mock
 * interview are LOCKED cards with honest phase badges — clickable, and clicking
 * shows a short "Coming in Phase N" note (never a dead link, never a broken
 * screen). No sidebar/bottom-nav entries are added for these — TASK-004 excluded
 * them deliberately; only the locked cards live in the dashboard body.
 *
 * Readiness ring reuses TASK-026's ReadinessRing, sourced from GET
 * /api/profile's readiness_score (stored, recomputed on save) and tappable
 * through to /profile. "Items remaining" reuses the same finish-these
 * calculation as /profile (TASK-024) via calculateReadiness.
 *
 * PRICE NOTE (deliberate deviation from the mockup's "₹499 · about 2 minutes"):
 * the live card shows "About 2 minutes" without a hardcoded ₹ figure, because
 * docs MVP/TASK-047 established that prices are never hard-coded in application
 * code (they live in the `pricing` table, read server-side via lib/pricing.ts,
 * which a client component cannot call — and no client pricing endpoint exists).
 * The price still appears on the purchase surfaces; adding a price read here
 * needs a pricing endpoint, out of this ticket's scope.
 */

type LockedService = 'ats' | 'cover' | 'qa' | 'mock'

const LOCKED: ReadonlyArray<{
  key: LockedService
  title: string
  icon: string
  iconClass: string
  badge: string
  phase: string
  dashed: boolean
}> = [
  { key: 'ats', title: 'ATS score check', icon: '◑', iconClass: 'text-emerald', badge: 'Free · Phase 2', phase: '2', dashed: false },
  { key: 'cover', title: 'Cover letter', icon: '✎', iconClass: 'text-state-gold-text', badge: 'Phase 3', phase: '3', dashed: false },
  { key: 'qa', title: 'Interview Q&A study', icon: '?', iconClass: 'text-ink-faint', badge: 'Phase 4', phase: '4', dashed: true },
  { key: 'mock', title: 'Mock interview', icon: '◉', iconClass: 'text-ink-faint', badge: 'Phase 4', phase: '4', dashed: true },
]

export default function DashboardPage() {
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [packageCount, setPackageCount] = useState<number>(0)
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
    // Package count drives the Library preview's "N packages".
    fetch('/api/packages', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then((data) => {
        if (Array.isArray(data?.packages)) setPackageCount(data.packages.length)
      })
      .catch(() => {
        /* non-fatal */
      })
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
  const subheader = targetParts ? `Targeting ${targetParts}` : 'Targeting —'

  // Ring score: the stored readiness_score (recomputed on save) is authoritative;
  // items-left reuses the same field-level finish-these calc as /profile.
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
  const itemsLeft = readiness?.missing.length ?? 0

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* ── Header: greeting + target line + readiness ring ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-[25px] leading-tight text-midnight">Hello, {firstName}</h1>
          {subheader ? <p className="text-[11.5px] text-ink-warm">{subheader}</p> : null}
        </div>
        {/* Ring taps through to the profile editor */}
        <Link
          href="/profile"
          aria-label="Profile readiness"
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
        >
          <ReadinessRing score={score} size={48} />
        </Link>
      </div>

      {/* ── Services grid ── */}
      <section>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-warm">
          Services
        </div>

        {lockedNote ? (
          <div className="mb-3 rounded-xl border border-gold/30 bg-state-gold-bg px-3.5 py-3 text-[12px] text-state-gold-text">
            {lockedNote}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Live — primary CTA, navy */}
          <Link
            href="/optimize/target"
            className={cn(
              'flex min-h-11 items-center justify-between gap-3 rounded-[14px] bg-midnight p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2',
              'row-span-1 sm:col-span-2 lg:col-span-1'
            )}
          >
            <span className="flex flex-col gap-1">
              <span className="text-[14px] font-bold leading-tight text-marble">
                Optimize resume for a job
              </span>
              <span className="text-[11px] text-marble/60">About 2 minutes</span>
            </span>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-gold text-[16px] font-bold text-midnight">
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
              className={cn(
                'flex min-h-[96px] flex-col gap-1.5 rounded-[13px] p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2',
                svc.dashed
                  ? 'border border-dashed border-line-strong bg-fill-subtle'
                  : 'border border-line bg-white'
              )}
            >
              <span className={cn('text-[15px]', svc.iconClass)}>{svc.icon}</span>
              <span className="text-[12.5px] font-bold leading-tight text-midnight">{svc.title}</span>
              <span
                className={cn(
                  'mt-auto self-start rounded-[5px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                  svc.dashed
                    ? 'bg-state-gold-bg/50 text-ink-warm'
                    : svc.key === 'ats'
                      ? 'bg-state-emerald-bg text-emerald'
                      : 'bg-state-gold-bg text-state-gold-text'
                )}
              >
                {svc.badge}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Library preview ── */}
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-warm">
            Library · {packageCount} package{packageCount === 1 ? '' : 's'}
          </span>
          <Link
            href="/dashboard/library"
            className="text-[11px] font-medium text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2"
          >
            See all
          </Link>
        </div>
        {packageCount === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-5 text-[12.5px] text-ink-muted">
            No packages yet — optimize a resume and it will appear here.
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-white p-4 text-[13px] font-medium text-midnight">
            {packageCount} saved optimization{packageCount === 1 ? '' : 's'} — open one to view or
            download.
          </div>
        )}
      </section>

      {/* ── Career Profile entry point ── */}
      <Link
        href="/profile"
        className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-white p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-midnight">Career Profile</span>
          <span className="text-[10.5px] text-ink-warm">
            {itemsLeft} item{itemsLeft === 1 ? '' : 's'} left · powers every service
          </span>
        </span>
        <span className="text-[13px] font-semibold text-emerald">→</span>
      </Link>
    </div>
  )
}
