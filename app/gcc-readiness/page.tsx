'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import ReadinessRing from '@/components/ui/ReadinessRing'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { buttonVariants } from '@/components/ui/Button'
import { ScorecardResult } from '@/components/gulfReadiness/ScorecardResult'
import { cn } from '@/lib/utils'
import { calculateReadiness } from '@/lib/readiness'
import type { ReadinessInput, ReadinessResult } from '@/lib/readiness'
import {
  answersFromReadinessCategory,
  scoreProfileReadiness,
  scoringInputFromProfile,
} from '@/lib/gulfReadiness/fromProfile'
import type { CareerProfileFull } from '@/types/careerProfile'

/**
 * Profile Strength AND Gulf Readiness — the two scores, and what raises each.
 *
 * Founder request 2026-09-11: the page showed only Profile Strength; it should
 * carry both, each with its own requirements. Two tabs, both numbers always
 * visible in the tab bar — see the decision log for why tabs rather than one
 * long page.
 *
 * ZERO NEW COMPUTATION, on either tab:
 *   · Profile Strength calls `calculateReadiness()` with the dashboard's exact
 *     input construction, so the score and missing list match /dashboard.
 *   · Gulf Readiness renders the same `ScorecardResult` that /onboarding/report
 *     shows after signup, unlocked, scored through `scoringInputFromProfile` —
 *     the same function the dashboard card uses. Three surfaces, one number.
 *
 * `?tab=gulf` opens the second tab; the dashboard's Gulf Readiness card links
 * there.
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

type Tab = 'strength' | 'gulf'
const TAB_ORDER: readonly Tab[] = ['strength', 'gulf']

/**
 * The tab bar IS the summary: each tab carries its score, so switching tabs
 * never hides a number — only the detail behind it.
 *
 * Real tabs for assistive tech (tablist / tab / tabpanel, roving tabindex,
 * arrow keys), because two buttons that swap content without saying so leave a
 * screen-reader user guessing what changed.
 */
function ScoreTabs({
  tab,
  onChange,
  strength,
  gulf,
}: {
  tab: Tab
  onChange: (t: Tab) => void
  strength: number
  gulf: number
}) {
  const tabs: ReadonlyArray<{ key: Tab; label: string; score: number }> = [
    { key: 'strength', label: 'Profile Strength', score: strength },
    { key: 'gulf', label: 'Gulf Readiness', score: gulf },
  ]

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = TAB_ORDER[(TAB_ORDER.indexOf(tab) + 1) % TAB_ORDER.length]
    onChange(next)
    document.getElementById(`score-tab-${next}`)?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Your two scores"
      className="mt-6 grid grid-cols-2 gap-1.5 rounded-card border border-line bg-white p-1.5 shadow-m-1"
    >
      {tabs.map((t) => {
        const selected = tab === t.key
        return (
          <button
            key={t.key}
            id={`score-tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`score-panel-${t.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={onKeyDown}
            className={cn(
              'flex min-h-[64px] flex-col items-start justify-center gap-1 rounded-ctl px-3.5 py-2.5 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
              selected ? 'bg-teal shadow-m-1' : 'hover:bg-canvas',
            )}
          >
            <span className={cn('text-[13px] font-semibold leading-tight', selected ? 'text-teal-soft' : 'text-ink-muted')}>
              {t.label}
            </span>
            <span className={cn('font-mono text-[22px] leading-none', selected ? 'text-white' : 'text-ink')}>
              {t.score}
              <span className={cn('text-[12px]', selected ? 'text-teal-soft' : 'text-ink-muted')}>/100</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function GccReadinessScreen() {
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const didInit = useRef(false)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [tab, setTab] = useState<Tab>(searchParams?.get('tab') === 'gulf' ? 'gulf' : 'strength')

  // The URL follows the tab, so a refresh or a shared link reopens the same one.
  const chooseTab = (t: Tab) => {
    setTab(t)
    router.replace(t === 'gulf' ? `${pathname}?tab=gulf` : pathname ?? '/gcc-readiness', { scroll: false })
  }

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

  const readiness: ReadinessResult | null = useMemo(
    () => (profile ? calculateReadiness(toReadinessInput(profile)) : null),
    [profile],
  )
  // Same scenario reconstruction and same input mapping as the dashboard card.
  const gulf = useMemo(
    () =>
      profile && readiness
        ? scoreProfileReadiness(scoringInputFromProfile(profile), answersFromReadinessCategory(readiness.category))
        : null,
    [profile, readiness],
  )

  if (!loaded) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas font-redesign-sans">
        <p className="font-mono text-sm text-ink-muted">Loading…</p>
      </main>
    )
  }

  // Identical computation + authoritative score source to /dashboard:
  // stored readiness_score (recomputed on save) is authoritative; the
  // "missing" list always comes from the live calculateReadiness() over the
  // same source profile.
  const score = profile?.readiness_score ?? readiness?.score ?? 0
  const missing = readiness?.missing ?? []
  const category = readiness?.category

  return (
    <PageShell
      width="wide"
      title="Profile Strength & Gulf Readiness"
      subtitle="Two scores that measure different things. Each one lists exactly what raises it."
    >
      {loadError ? (
        <div className="rounded-card border border-alert/40 bg-alert-soft px-3.5 py-3 text-[13px] text-alert">
          {loadError}
        </div>
      ) : !profile ? (
        // NO PROFILE IS NOT "ALL COMPLETE".
        //
        // With no profile, `missing` is an empty array — because there was
        // nothing to check, not because nothing is missing. This screen used to
        // read that as success and tell a brand-new user "0/100 · Every section
        // complete · Your profile is 100% ready." Three claims, all false, on the
        // first screen a new user might open. Found in the 2026-09-10 end-to-end
        // audit. Now the empty case is its own state and says what is true —
        // for both scores, since neither can be computed without a profile.
        <Card tone="light" className="mt-6 flex flex-col items-center gap-4 p-8 text-center">
          <ReadinessRing score={0} size={112} dark />
          <div className="flex flex-col gap-1.5">
            <h2 className="font-display text-[22px] font-semibold text-ink">Not started yet</h2>
            <p className="max-w-[46ch] text-[14px] leading-relaxed text-ink-soft">
              Both scores appear once your Career Profile exists. Upload your CV and we fill it in for
              you — it takes about a minute.
            </p>
          </div>
          <Link
            href="/profile?import=upload"
            className={cn(buttonVariants({ variant: 'primary' }), 'w-full text-[14px] sm:w-auto')}
          >
            Build my profile from my CV
          </Link>
        </Card>
      ) : (
        <>
          <ScoreTabs tab={tab} onChange={chooseTab} strength={score} gulf={gulf?.finalScore ?? 0} />

          {tab === 'strength' ? (
            <div id="score-panel-strength" role="tabpanel" aria-labelledby="score-tab-strength" className="mt-5">
              <p className="text-[13px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-ink">How complete your Career Profile is.</span> Every CV and
                cover letter is built from it, so a missing field is missing from all of them.
              </p>

              {/* ——— ring / breakdown, §C: side-by-side on xl (rail), stacked below ——— */}
              <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-start">
                {/* Readiness ring */}
                <Card tone="light" className="flex flex-col items-center gap-4 p-8 text-center xl:w-[340px] xl:shrink-0">
                  <div className="flex flex-col items-center gap-3">
                    <ReadinessRing score={score} size={132} dark />
                    <span className="font-mono text-[26px] leading-none text-teal">
                      {score}
                      <span className="text-[15px] text-ink-muted">/100</span>
                    </span>
                  </div>
                  {category ? <Pill variant="grounded">{categoryLabel(category)}</Pill> : null}
                  <p className="text-[13px] leading-relaxed text-ink-muted">
                    {missing.length === 0
                      ? 'Every section complete.'
                      : `${missing.length} item${missing.length === 1 ? '' : 's'} still needed.`}
                  </p>
                  <Link
                    href="/profile"
                    className={cn(buttonVariants({ variant: 'primary' }), 'w-full text-[14px]')}
                  >
                    {missing.length === 0 ? 'View Career Profile' : 'Complete profile'}
                  </Link>
                </Card>

                {/* Breakdown list */}
                <Card tone="light" className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      Finish these to reach 100
                    </span>
                    <p className="text-[12px] text-ink-muted">Each one raises your score. Tap to edit on your profile.</p>
                  </div>

                  {missing.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-canvas/50 p-8 text-center">
                      <span className="font-display text-2xl text-teal">All complete</span>
                      <p className="max-w-sm text-[13px] leading-relaxed text-ink-muted">
                        Your profile is 100% ready. Every section used by a future Gulf application is filled in.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {missing.map((m) => (
                        <Link
                          key={m.field}
                          href="/profile"
                          className="flex min-h-11 items-center justify-between gap-3 rounded-ctl border border-line/70 bg-canvas/50 px-4 py-3 transition-colors hover:border-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                        >
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate text-[13px] font-semibold text-ink/85">{m.label}</span>
                            <span className="text-[12px] text-ink-muted">+{m.points} points</span>
                          </span>
                          <span className="shrink-0 text-[12px] font-semibold text-teal">Add →</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          ) : (
            <div id="score-panel-gulf" role="tabpanel" aria-labelledby="score-tab-gulf" className="mt-5">
              <p className="text-[13px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-ink">How ready you are for the Gulf job market</span>, read from
                what your Career Profile says. It rises as your profile shows more — the ranked list at the bottom is
                where to start.
              </p>

              {gulf ? (
                <div className="mt-4 flex flex-col gap-6">
                  <ScorecardResult result={gulf} locked={false} source="profile" />
                  <Link
                    href="/profile"
                    className={cn(buttonVariants({ variant: 'primary' }), 'w-full text-[14px] sm:w-fit')}
                  >
                    Improve it on my Career Profile
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </PageShell>
  )
}

export default function GccReadinessPage() {
  return (
    <>
      <Suspense>
        <GccReadinessScreen />
      </Suspense>
    </>
  )
}
