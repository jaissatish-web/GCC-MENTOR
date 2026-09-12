'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FieldLabel } from '@/components/ui/FieldLabel'
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
  // No Career Profile yet (GET /api/profile answered 404). Every CV is built
  // from the profile, so going on from here only reached "Could not load your
  // profile" on the next screen — a dead end the dashboard's quick actions and
  // the cover letter's empty state both led into.
  const [noProfile, setNoProfile] = useState(false)
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
        if (data === null) setNoProfile(true)
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
        <p className="font-mono text-sm text-ink-muted">Loading…</p>
      </main>
    )
  }

  if (noProfile) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-5 py-10 font-redesign-sans">
        <Card tone="light" className="flex w-full max-w-[520px] flex-col gap-3 p-6 sm:p-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Before your first CV
          </p>
          <h1 className="font-display text-[26px] leading-tight text-ink">First, your Career Profile</h1>
          <p className="text-[14px] leading-relaxed text-ink-soft">
            Every CV is written only from the facts in your Career Profile, so it needs to exist before we
            can tailor one. Upload your CV and we fill it in for you.
          </p>
          <div className="mt-3 flex flex-col gap-2.5">
            <Link href="/profile?import=upload" className={buttonVariants({ variant: 'primary' })}>
              Build my Career Profile
            </Link>
            <Link href="/dashboard" className={buttonVariants({ variant: 'secondary' })}>
              Back to dashboard
            </Link>
          </div>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col font-redesign-sans">
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-5 py-8 sm:px-8 lg:py-12">
      {/* Back + step. Was "3/5" of a five-step flow that no longer exists; the
          optimizer is three screens: target, what to sharpen, build. */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-ctl text-[20px] leading-none text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
        >
          ←
        </button>
        <div className="flex-1">
          <ProgressBar value={33} tone="light" />
        </div>
        <span className="font-mono text-[12px] text-ink-muted">Step 1 of 3</span>
      </div>

      {/* Heading */}
      <div className="px-5 pb-4">
        <h1 className="font-display text-[27px] leading-tight text-ink">Set your target role</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
          One required field. A job description or industry sharpens the result — neither is needed to start.
        </p>
      </div>

      {loadError ? (
        <div className="mx-5 mb-3 rounded-card border border-alert/30 bg-alert-soft px-3.5 py-3 text-[12px] text-alert">
          {loadError}
        </div>
      ) : null}

      {/* Fields */}
      <Card tone="light" className="mt-5 flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <Input
          id="f_target_job_title"
          label="Target job title"
          requiredMark
          value={draft.target_job_title}
          onChange={(e) => set('target_job_title', e.target.value)}
          placeholder="e.g. Commissioning Engineer (I&C)"
          hint="Use the title from the job advert if you have one."
          tone="light"
        />

        {/* Reuse detection prompt (TASK-036) — fires when a similar-titled
            package already exists */}
        {similar && !dismissed ? (
          <div className="rounded-card border border-teal/50 bg-teal-soft p-3.5">
            {/* Plain words (2026-09-12): "package" is our table name and
                "Phase 2" our roadmap. And say what replacing really removes —
                setup deletes the whole old row, letters and stage included. */}
            <p className="text-[12px] leading-snug text-teal">
              You already have a CV for &ldquo;{similar.title}&rdquo;. Replace it with a new one, or keep
              both?
            </p>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              Replacing removes the old one — its CV, cover letters and stage — once the new one is created.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplacingId(similar.id)
                  setDismissed(true)
                }}
                className="min-h-11 rounded-ctl bg-teal px-3.5 py-2 text-[12px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
              >
                Replace it
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplacingId(null)
                  setDismissed(true)
                }}
                className="min-h-11 rounded-ctl border border-line-strong bg-white px-3.5 py-2 text-[12px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
              >
                Keep both
              </button>
            </div>
          </div>
        ) : null}

        {similar && replacingId ? (
          <div className="rounded-card border border-teal/30 bg-teal-soft px-3.5 py-3 text-[12px] leading-snug text-teal">
            Your existing &ldquo;{similar.title}&rdquo; CV will be replaced once the new one is created.{' '}
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

        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="f_target_industry" optional>
            Target industry
          </FieldLabel>
          <select
            id="f_target_industry"
            className="field"
            value={draft.target_industry}
            onChange={(e) => set('target_industry', e.target.value)}
          >
            {/* Was "No preference — general Gulf recruiter", which a 375px
                screen cut to "general Gulf recrui". The hint says the rest. */}
            <option value="">No preference</option>
            {PERSONA_INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
          <p className="field-hint">Picks which kind of Gulf recruiter your CV is written for.</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="f_job_description" optional>
              Job description
            </FieldLabel>
            <span className="rounded-[5px] bg-teal-soft px-2 py-1 text-[12px] font-semibold uppercase tracking-wider text-teal">
              Best results
            </span>
          </div>
          <div className="flex flex-col gap-2.5 rounded-card border border-dashed border-teal p-4">
            <div className="text-[13px] font-medium leading-snug text-ink">
              Paste the job posting for the closest match
            </div>
            <p className="text-[12px] leading-snug text-ink-muted">
              Paste the advert and we match its exact wording and requirements. Without one we work from your target role.
            </p>
            <textarea
              id="f_job_description"
              rows={5}
              value={draft.job_description}
              onChange={(e) => set('job_description', e.target.value)}
              placeholder="Paste the job posting text here…"
              className="field"
            />
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div className="flex flex-col gap-2.5 px-5 pb-6 pt-4">
        {/* Was "Still free — you'll see what changes before you pay." There is
            no checkout yet, so a sentence about paying is a promise about a
            step that does not exist. What IS true is the preview. */}
        <p className="text-center text-[12px] leading-snug text-ink-muted">
          You see every change to your CV before you download it.
        </p>
        <Button variant="progress" className="w-full" disabled={!canContinue} onClick={onContinue}>
          Choose what to optimize
        </Button>
        {!canContinue ? (
          <p className="text-center text-[12px] text-ink-muted">
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
    <>
      <Suspense>
        <TargetScreen />
      </Suspense>
    </>
  )
}
