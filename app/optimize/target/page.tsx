'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Card } from '@/components/ui/Card'
import { PERSONA_INDUSTRIES } from '@/lib/utils'
import { OPTIMIZATION_REPLACE_PACKAGE_KEY, OPTIMIZATION_TARGET_DRAFT_KEY } from '@/lib/onboardingDraft'
import { findSimilarPackage } from '@/lib/reuseDetection'
import type { Package } from '@/types/package'

/**
 * Target selection — screen 05 (TASK-027), route /optimize/target.
 *
 * Simplified 2026-08-18 (founder decision) to one required question — the
 * target job title — plus two optional ones that sharpen the result. This
 * matches how a resume-optimization SaaS actually gets used: the user wants
 * their resume tailored to a ROLE first; everything else is a lever they can
 * pull if they have it, never a form to fill in before they're allowed to
 * start.
 *
 * WHAT CHANGED and why each field survived or didn't:
 *  - Target country: REMOVED from this screen entirely. It never changed CV
 *    format or generation behaviour (migration 030's own reasoning — the Gulf
 *    writing convention has always been one country-agnostic set of rules,
 *    lib/ai/buildOptimizationPrompt.ts's GULF_FORMAT_NOTE) so asking for it
 *    here was a question with no effect on the output.
 *  - Target company: REMOVED from this screen entirely, for the same reason
 *    — it only ever changed the CTA label ("Optimize for {company}"), never
 *    the writing itself. The CTA now names the target role instead.
 *  - Target industry: kept, but now OPTIONAL (migration 043). It drives which
 *    reviewer persona writes the resume (lib/ai/personas.ts) — a real effect,
 *    worth keeping — but the prompt pipeline already has a graceful fallback
 *    persona for "unset", so nothing forces the choice.
 *  - Job description: kept, still optional with a "Best results" framing —
 *    this is the field with the clearest, most direct payoff (exact keyword
 *    and requirement matching), so it earns emphasis without being required.
 *    The disabled "upload the PDF" stub is gone — it was never wired to
 *    anything (no JD-PDF extraction route exists or is speced) and sat there
 *    as a dead button. Paste is the one real path and is what is offered.
 *
 * PRE-FILL from the profile (contract #2, narrowed to what remains): GET
 * /api/profile still prefills target_job_title and, when it exactly matches a
 * PERSONA_INDUSTRIES value, target_industry — both are profile-level DEFAULTS
 * (set on /profile) offered here as editable starting values for this one
 * optimization run.
 *
 * REUSE DETECTION (TASK-036): once the user types a target title, if a
 * similar-titled package exists in their Library (GET /api/packages) a prompt
 * offers "re-optimize" (overwrites its text) or "start fresh"; choosing
 * re-optimize carries the old package's id forward via
 * OPTIMIZATION_REPLACE_PACKAGE_KEY so /optimize/setup deletes it only after the
 * new one is confirmed created. Pure rule-based title matching — no
 * automated %-matching (that is Phase 2).
 *
 * HANDOFF: on "Choose what to optimize" the collected target is written to
 * sessionStorage under OPTIMIZATION_TARGET_DRAFT_KEY; /optimize/setup reads
 * and clears it.
 */

interface TargetDraft {
  target_job_title: string
  target_industry: string
  job_description: string
}

const EMPTY: TargetDraft = {
  target_job_title: '',
  target_industry: '',
  job_description: '',
}

function TargetScreen() {
  const router = useRouter()
  const [draft, setDraft] = useState<TargetDraft>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [existingPackages, setExistingPackages] = useState<Package[] | null>(null)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const didInit = useRef(false)

  // Prefill from the profile's target defaults on mount (contract #2).
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
        // target_industry on /profile (TASK-024) is FREE TEXT, not a persona
        // value — only prefill this select if it exactly matches one of
        // PERSONA_INDUSTRIES' values, otherwise leave it empty so the select
        // shows its placeholder and the user picks a real persona-driving
        // value (a stray free-text value here would silently pass the
        // required-field check without actually selecting a valid persona).
        const rawIndustry = typeof data?.target_industry === 'string' ? data.target_industry : ''
        const matchedIndustry = PERSONA_INDUSTRIES.some((i) => i.value === rawIndustry) ? rawIndustry : ''
        setDraft({
          target_job_title: data?.target_job_title ?? '',
          target_industry: matchedIndustry,
          job_description: '',
        })
        setLoaded(true)
      })
      .catch(() => {
        // Non-fatal: blank fields, surface a notice (pre-Supabase behaviour).
        setLoadError('Could not load your profile defaults.')
        setLoaded(true)
      })

    // Load existing packages (TASK-035) for reuse detection (TASK-036).
    fetch('/api/packages', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then((data) => {
        if (Array.isArray(data?.packages)) {
          setExistingPackages(data.packages as Package[])
        } else {
          setExistingPackages([])
        }
      })
      .catch(() => setExistingPackages([]))
  }, [])

  const set = useCallback(<K extends keyof TargetDraft>(key: K, value: TargetDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
  }, [])

  // Reuse detection (TASK-036): rule-based title comparison against the user's
  // existing packages, evaluated live as the target title is typed.
  const similar = useMemo(() => {
    if (!existingPackages) return null
    return findSimilarPackage(draft.target_job_title.trim(), existingPackages)
  }, [draft.target_job_title, existingPackages])

  // If the match disappears (title edited, packages change), reset the choice so
  // the prompt can re-offer it.
  useEffect(() => {
    if (!similar) {
      setReplacingId(null)
      setDismissed(false)
    }
  }, [similar])

  // Only the target job title is required (migration 043, founder decision
  // 2026-08-18). Industry and job description both sharpen the result but
  // neither blocks starting — see the file header for why each field is or
  // isn't required.
  const canContinue = draft.target_job_title.trim() !== ''

  const onContinue = useCallback(() => {
    if (!canContinue) return
    // Handoff to /optimize/setup (TASK-028 reads + clears this).
    window.sessionStorage.setItem(OPTIMIZATION_TARGET_DRAFT_KEY, JSON.stringify(draft))
    // Carry forward which existing package (if any) this run replaces, so setup
    // can delete it ONLY after a confirmed successful new package is created.
    if (replacingId) {
      window.sessionStorage.setItem(OPTIMIZATION_REPLACE_PACKAGE_KEY, replacingId)
    } else {
      window.sessionStorage.removeItem(OPTIMIZATION_REPLACE_PACKAGE_KEY)
    }
    router.push('/optimize/setup')
  }, [canContinue, draft, replacingId, router])

  if (!loaded) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="font-mono text-sm text-ink-400">Loading…</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col font-redesign-sans">
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-5 py-8 sm:px-8 lg:py-12">
      {/* Back + progress 3/5 */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-radius-md text-[20px] leading-none text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2"
        >
          ←
        </button>
        <div className="flex-1">
          <ProgressBar value={60} tone="light" />
        </div>
        <span className="font-mono text-[11px] text-ink-400">3/5</span>
      </div>

      {/* Heading */}
      <div className="px-5 pb-4">
        <h1 className="font-serif text-[27px] leading-tight text-ink-900">Set your target role</h1>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-700">
          One required field. Add a job description or industry too and we&rsquo;ll tailor the wording
          more precisely — but your resume is optimized either way.
        </p>
      </div>

      {loadError ? (
        <div className="mx-5 mb-3 rounded-radius-lg border border-terra/30 bg-terra-tint px-3.5 py-3 text-[12px] text-terra">
          {loadError}
        </div>
      ) : null}

      {/* Fields */}
      <Card tone="light" className="mt-5 flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="f_target_job_title" className="text-[11px] font-semibold tracking-wide text-ink-700">
            Target job title <span className="text-terra">*</span>
          </label>
          <Input
            id="f_target_job_title"
            value={draft.target_job_title}
            onChange={(e) => set('target_job_title', e.target.value)}
            placeholder="e.g. Commissioning Engineer (I&C)"
            tone="light"
          />
        </div>

        {/* Reuse detection prompt (TASK-036) — fires when a similar-titled
            package already exists */}
        {similar && !dismissed ? (
          <div className="rounded-radius-lg border border-redesign-gold/50 bg-redesign-gold-tint p-3.5">
            <p className="text-[12px] leading-snug text-gold-text">
              You already have a &ldquo;{similar.title}&rdquo; package — re-optimize it (overwrites its
              current text), or start fresh?
            </p>
            <p className="mt-0.5 text-[10.5px] text-ink-400">Keeping past versions arrives in Phase 2.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplacingId(similar.id)
                  setDismissed(true)
                }}
                className="min-h-11 rounded-radius-md bg-forest-deep px-3.5 py-2 text-[11px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2"
              >
                Re-optimize
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplacingId(null)
                  setDismissed(true)
                }}
                className="min-h-11 rounded-radius-md border border-line-light-strong bg-surface-light px-3.5 py-2 text-[11px] font-semibold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2"
              >
                Start fresh
              </button>
            </div>
          </div>
        ) : null}

        {similar && replacingId ? (
          <div className="rounded-radius-lg border border-forest/30 bg-forest-tint px-3.5 py-3 text-[11.5px] leading-snug text-forest">
            Will re-optimize your existing &ldquo;{similar.title}&rdquo; package — its current text will be
            replaced.{' '}
            <button
              type="button"
              onClick={() => {
                setReplacingId(null)
                setDismissed(false)
              }}
              className="font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
            >
              Change
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor="f_target_industry" className="text-[11px] font-semibold tracking-wide text-ink-700">
            Target industry <span className="font-normal text-ink-400">— optional, drives the writing persona</span>
          </label>
          <select
            id="f_target_industry"
            className="min-h-11 w-full rounded-radius-md border border-line-light bg-surface-light px-[15px] py-[13px] text-sm font-medium text-ink-900 outline-none transition-colors focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/20"
            value={draft.target_industry}
            onChange={(e) => set('target_industry', e.target.value)}
          >
            <option value="">No preference — general Gulf recruiter</option>
            {PERSONA_INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold tracking-wide text-ink-700">
              Job description <span className="font-normal text-ink-400">— optional</span>
            </div>
            <span className="rounded-[5px] bg-redesign-gold-tint px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-gold-text">
              Best results
            </span>
          </div>
          <div className="flex flex-col gap-2.5 rounded-radius-lg border border-dashed border-redesign-gold p-4">
            <div className="text-[13px] font-medium leading-snug text-ink-900">
              Paste the job posting for the closest match
            </div>
            <p className="text-[11px] leading-snug text-ink-400">
              With a job description, we match the employer&apos;s exact wording and requirements. Without
              one, we still optimize your resume using your target role and industry.
            </p>
            <textarea
              id="f_job_description"
              rows={5}
              value={draft.job_description}
              onChange={(e) => set('job_description', e.target.value)}
              placeholder="Paste the job posting text here…"
              className="min-h-11 w-full resize-none rounded-radius-md border border-line-light bg-surface-light px-[15px] py-[13px] text-sm font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/20"
            />
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div className="flex flex-col gap-2.5 px-5 pb-6 pt-4">
        <p className="text-center text-[11px] leading-snug text-ink-400">
          Still free — you&apos;ll see what changes before you pay.
        </p>
        <Button variant="progress" className="w-full" disabled={!canContinue} onClick={onContinue}>
          Choose what to optimize
        </Button>
        {!canContinue ? (
          <p className="text-center text-[11px] text-ink-400">
            Add a target job title to continue.
          </p>
        ) : null}
      </div>
      </div>
    </main>
  )
}

// Keep a Suspense boundary for future useSearchParams safety during prerender.
export default function OptimizeTargetPage() {
  return (
    <AppShell>
      <Suspense>
        <TargetScreen />
      </Suspense>
    </AppShell>
  )
}
