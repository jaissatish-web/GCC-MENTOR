'use client'

import Link from 'next/link'
import { Suspense, useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageShell } from '@/components/layout/PageShell'
import ReadinessRing from '@/components/ui/ReadinessRing'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { calculateReadiness } from '@/lib/readiness'
import type { ReadinessInput, ReadinessResult } from '@/lib/readiness'
import type { CareerProfileFull } from '@/types/careerProfile'

/**
 * GCC Readiness — new route (TASK-091, PAGE_SPECS §C / Stage 1 item 5).
 *
 * Standalone view of the GCC Readiness score + "missing" list that today
 * only appears embedded on /dashboard. ZERO new computation — it calls the
 * same `calculateReadiness()` (lib/readiness.ts is read, NEVER modified)
 * with the SAME input construction the dashboard uses, so the score and
 * missing list MATCH /dashboard's readiness card exactly (the ticket's
 * acceptance test: two surfaces, one number, always).
 *
 * Layout per §C: large readiness ring + category breakdown side-by-side on
 * xl (rail-style), stacked from 1024–1279px, ring-above-list on tablet/
 * mobile. Each incomplete item links back to /profile (same destination the
 * dashboard's "finish these" chips use — the profile editor scopes to the
 * loaded profile and its own inline focus, there is no route-hash autofocus).
 */

// Mirror the dashboard's EXACT calculateReadiness input construction so the
// computed score + missing list are byte-identical (parity acceptance test).
function toReadinessInput(p: CareerProfileFull): ReadinessInput {
  return {
    currently_in_gulf: p.currently_in_gulf,
    full_name: p.full_name,
    phone: p.phone,
    email: p.email,
    current_location: p.current_location,
    target_job_title: p.target_job_title,
    target_country: p.target_country || undefined,
    target_industry: p.target_industry,
    target_company: p.target_company,
    visa_status: p.visa_status,
    visa_transferable: p.visa_transferable,
    notice_period: p.notice_period,
    passport_validity_date: p.passport_validity_date,
    work_experience: p.work_experience.map((w) => ({
      start_date: w.start_date,
      end_date: w.end_date || null,
    })),
    education: p.education,
    certifications: p.certifications,
    skills: p.skills,
  }
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

function GccReadinessScreen() {
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    fetch('/api/profile', { cache: 'no-store' })
      .then((res) => {
        if (res.status === 200) return res.json()
        if (res.status === 404) return null
        throw new Error(String(res.status))
      })
      .then((data) => {
        setProfile(data ? (data as CareerProfileFull) : null)
        setLoaded(true)
      })
      .catch(() => {
        setLoadError('Could not load your readiness. Please try again.')
        setLoaded(true)
      })
  }, [])

  if (!loaded) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg font-redesign-sans">
        <p className="font-mono text-sm text-ink-400">Loading…</p>
      </main>
    )
  }

  // Identical computation + authoritative score source to /dashboard:
  // stored readiness_score (recomputed on save) is authoritative; the
  // "missing" list always comes from the live calculateReadiness() over the
  // same source profile.
  const readiness: ReadinessResult | null = profile ? calculateReadiness(toReadinessInput(profile)) : null
  const score = profile?.readiness_score ?? readiness?.score ?? 0
  const missing = readiness?.missing ?? []
  const category = readiness?.category

  return (
    <PageShell
      width="wide"
      title="Profile Strength"
      subtitle="How complete is the profile your future Gulf applications are built from."
    >
      {loadError ? (
        <div className="rounded-radius-lg border border-terra/40 bg-terra-tint px-3.5 py-3 text-[12.5px] text-terra">
          {loadError}
        </div>
      ) : (
        <>
          {/* ——— ring / breakdown, §C: side-by-side on xl (rail), stacked below ——— */}
          <div className="mt-6 flex flex-col gap-6 xl:flex-row xl:items-start">
            {/* Readiness ring */}
            <Card tone="light" className="flex flex-col items-center gap-4 p-8 text-center xl:w-[340px] xl:shrink-0">
              <div className="flex flex-col items-center gap-3">
                <ReadinessRing score={score} size={132} dark />
                <span className="font-mono text-[26px] leading-none text-gold-text">
                  {score}
                  <span className="text-[15px] text-ink-400">/100</span>
                </span>
              </div>
              {category ? <Pill variant="grounded">{categoryLabel(category)}</Pill> : null}
              <p className="text-[12.5px] leading-relaxed text-ink-400">
                {missing.length === 0
                  ? 'Every section complete.'
                  : `${missing.length} item${missing.length === 1 ? '' : 's'} still needed.`}
              </p>
              <Link
                href="/profile"
                className={cn(buttonVariants({ variant: 'primary' }), 'w-full text-[13.5px]')}
              >
                {missing.length === 0 ? 'View Career Profile' : 'Complete profile'}
              </Link>
            </Card>

            {/* Breakdown list */}
            <Card tone="light" className="flex flex-1 flex-col gap-4 p-6">
              <div className="flex flex-col gap-1">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Finish these to reach 100
                </span>
                <p className="text-[12px] text-ink-400">Each one raises your score. Tap to edit on your profile.</p>
              </div>

              {missing.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-radius-lg border border-dashed border-line-light bg-surface-2-light/50 p-8 text-center">
                  <span className="font-serif text-2xl text-forest">All complete</span>
                  <p className="max-w-sm text-[12.5px] leading-relaxed text-ink-400">
                    Your profile is 100% ready. Every section used by a future Gulf application is filled in.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {missing.map((m) => (
                    <Link
                      key={m.field}
                      href="/profile"
                      className="flex min-h-11 items-center justify-between gap-3 rounded-radius-md border border-line-light/70 bg-surface-2-light/50 px-4 py-3 transition-colors hover:border-redesign-gold/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[13px] font-semibold text-ink-900/85">{m.label}</span>
                        <span className="text-[11px] text-ink-400">+{m.points} points</span>
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-forest">Add →</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </PageShell>
  )
}

export default function GccReadinessPage() {
  return (
    <AppShell>
      <Suspense>
        <GccReadinessScreen />
      </Suspense>
    </AppShell>
  )
}