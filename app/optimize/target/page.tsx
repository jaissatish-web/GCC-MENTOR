'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn, GULF_COUNTRIES, PERSONA_INDUSTRIES } from '@/lib/utils'
import { OPTIMIZATION_REPLACE_PACKAGE_KEY, OPTIMIZATION_TARGET_DRAFT_KEY } from '@/lib/onboardingDraft'
import { findSimilarPackage } from '@/lib/reuseDetection'
import type { Package } from '@/types/package'

/**
 * Target selection — screen 05 (TASK-027), route /optimize/target.
 *
 * Conversion of the "05 · Target selection" screen in
 * design-reference/MVP Screens.dc.html (lines 720–767). Country is a CHIP ROW
 * (always, not a dropdown — unlike /profile), JD is framed as an upgrade never
 * a blocker, and the footer reassures "still free — you'll see what changes
 * before you pay."
 *
 * PRE-FILL from the profile (contract #2): career_profiles.target_* are the
 * profile-level DEFAULTS (set on /profile, TASK-024). We load GET /api/profile
 * and prefill this screen's fields as editable STARTING VALUES — this is a
 * per-optimization override, not a fresh ask each time. (A target_industry
 * free-text from /profile is preselected only if it exactly matches a
 * PERSONA_INDUSTRIES value; otherwise the select stays on its placeholder so
 * the user picks the persona-driving value.)
 *
 * INDUSTRY (contract #1): absent from the visual mockup but required by the
 * spec — docs/USER_FLOW.md's own field table lists it ("Target industry | yes |
 * select — drives persona"). Trusted over the mockup's visual completeness.
 * Required <select> using PERSONA_INDUSTRIES from lib/utils.ts.
 *
 * JD (contract #4): paste is real and needs no backend — the text is carried
 * forward as a plain string. Upload is a DISABLED "coming soon" stub: there is
 * NO speced/equivalent of /api/parse/upload for a JD PDF (a JD is a different
 * document; no such route exists or is speced). Whoever builds JD-PDF text
 * extraction should wire the real upload here. No upload API is invented.
 *
 * REUSE DETECTION (TASK-036): once the user types a target title, if a
 * similar-titled package exists in their Library (GET /api/packages) a prompt
 * offers "re-optimize" (overwrites its text) or "start fresh"; choosing
 * re-optimize carries the old package's id forward via
 * OPTIMIZATION_REPLACE_PACKAGE_KEY so /optimize/setup deletes it only after the
 * new one is confirmed created. Pure rule-based title matching — no
 * automated %-matching (that is Phase 2).
 *
 * HANDOFF (contract #6): /optimize/setup (TASK-028) does not exist yet either —
 * it is still the TASK-003 placeholder and there is nothing to POST to. On
 * "Choose what to optimize" we WRITE the collected target to sessionStorage
 * under OPTIMIZATION_TARGET_DRAFT_KEY (same pattern TASK-023 used for the
 * extraction draft), then navigate to /optimize/setup (it shows its placeholder
 * for now — expected). TASK-028 will read + clear this key when built.
 */

interface TargetDraft {
  target_job_title: string
  target_industry: string
  target_country: string
  target_company: string
  job_description: string
}

const EMPTY: TargetDraft = {
  target_job_title: '',
  target_industry: '',
  target_country: '',
  target_company: '',
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
          target_country: data?.target_country ?? '',
          target_company: data?.target_company ?? '',
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

  // Title, industry and country are required; company and JD are not.
  const canContinue =
    draft.target_job_title.trim() !== '' &&
    draft.target_industry !== '' &&
    draft.target_country !== ''

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
      <main className="flex min-h-dvh items-center justify-center bg-marble">
        <p className="font-mono text-sm text-ink-muted">Loading…</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col bg-marble">
      {/* Status bar */}
      <header className="flex h-11 items-center justify-between px-5 text-[12px] font-semibold text-midnight">
        <span>9:41</span>
        <span className="tracking-[0.14em]">▮▮▮</span>
      </header>

      {/* Back + progress 3/5 */}
      <div className="flex items-center gap-3.5 px-5 pb-4 pt-1.5">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-lg text-[20px] leading-none text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
        >
          ←
        </button>
        <div className="flex-1">
          <ProgressBar value={60} />
        </div>
        <span className="font-mono text-[11px] text-ink-muted">3/5</span>
      </div>

      {/* Heading */}
      <div className="px-5 pb-4">
        <h1 className="font-serif text-[27px] leading-tight text-midnight">Who are we targeting?</h1>
      </div>

      {loadError ? (
        <div className="mx-5 mb-3 rounded-xl border border-terracotta/30 bg-state-terra-bg px-3.5 py-3 text-[12px] text-state-terra-text">
          {loadError}
        </div>
      ) : null}

      {/* Fields */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="f_target_job_title" className="text-[11px] font-semibold tracking-wide text-ink-body">
            Target job title <span className="text-terracotta">*</span>
          </label>
          <Input
            id="f_target_job_title"
            value={draft.target_job_title}
            onChange={(e) => set('target_job_title', e.target.value)}
            placeholder="e.g. Commissioning Engineer (I&C)"
          />
        </div>

        {/* Reuse detection prompt (TASK-036) — fires when a similar-titled
            package already exists */}
        {similar && !dismissed ? (
          <div className="rounded-xl border border-state-gold-line bg-state-gold-bg p-3.5">
            <p className="text-[12px] leading-snug text-state-gold-text">
              You already have a &ldquo;{similar.title}&rdquo; package — re-optimize it (overwrites its
              current text), or start fresh?
            </p>
            <p className="mt-0.5 text-[10.5px] text-ink-muted">Keeping past versions arrives in Phase 2.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplacingId(similar.id)
                  setDismissed(true)
                }}
                className="min-h-11 rounded-lg bg-midnight px-3.5 py-2 text-[11px] font-semibold text-marble focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
              >
                Re-optimize
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplacingId(null)
                  setDismissed(true)
                }}
                className="min-h-11 rounded-lg border border-line-strong bg-white px-3.5 py-2 text-[11px] font-semibold text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
              >
                Start fresh
              </button>
            </div>
          </div>
        ) : null}

        {similar && replacingId ? (
          <div className="rounded-xl border border-emerald/30 bg-state-emerald-bg px-3.5 py-3 text-[11.5px] leading-snug text-emerald">
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
          <label htmlFor="f_target_industry" className="text-[11px] font-semibold tracking-wide text-ink-body">
            Target industry <span className="text-terracotta">*</span> <span className="font-normal text-ink-warm">— drives the writing persona</span>
          </label>
          <select
            id="f_target_industry"
            className="min-h-11 w-full rounded-lg border border-line bg-white px-[15px] py-[13px] text-sm font-medium text-midnight outline-none transition-colors focus:border-midnight focus:ring-2 focus:ring-midnight/20"
            value={draft.target_industry}
            onChange={(e) => set('target_industry', e.target.value)}
          >
            <option value="" disabled>
              Select an industry
            </option>
            {PERSONA_INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-semibold tracking-wide text-ink-body">
            Target country <span className="text-terracotta">*</span>{' '}
            <span className="font-normal text-ink-warm">— sets CV format conventions</span>
          </div>
          <div className="flex flex-wrap gap-[7px]">
            {GULF_COUNTRIES.map((c) => {
              const selected = draft.target_country === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => set('target_country', c.value)}
                  className={cn(
                    'min-h-11 rounded-[99px] px-[14px] py-[10px] text-[12px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2',
                    selected
                      ? 'bg-midnight text-marble'
                      : 'border border-line bg-white font-medium text-ink-body'
                  )}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="f_target_company" className="text-[11px] font-semibold tracking-wide text-ink-body">
            Target company <span className="font-normal text-ink-warm">— optional, sharpens framing</span>
          </label>
          <Input
            id="f_target_company"
            value={draft.target_company}
            onChange={(e) => set('target_company', e.target.value)}
            placeholder="Any employer"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold tracking-wide text-ink-body">
              Job description <span className="font-normal text-ink-warm">— optional</span>
            </div>
            <span className="rounded-[5px] bg-state-gold-bg px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-state-gold-text">
              Best results
            </span>
          </div>
          <div className="flex flex-col gap-2.5 rounded-xl border border-dashed border-gold p-4">
            <div className="text-[13px] font-medium leading-snug text-midnight">
              Paste the posting, or upload the PDF
            </div>
            <p className="text-[11px] leading-snug text-ink-muted">
              With a JD we match the employer&apos;s exact wording. Without one, we optimize to your title,
              industry and country.
            </p>
            <textarea
              id="f_job_description"
              rows={5}
              value={draft.job_description}
              onChange={(e) => set('job_description', e.target.value)}
              placeholder="Paste the job posting text here…"
              className="min-h-11 w-full resize-none rounded-lg border border-line bg-white px-[15px] py-[13px] text-sm font-medium text-midnight outline-none placeholder:text-ink-faint focus:border-midnight focus:ring-2 focus:ring-midnight/20"
            />
            {/* JD-PDF UPLOAD STUB (TASK-027 contract #4): no speced route exists
                to extract text from an uploaded JD PDF — /api/parse/upload is for
                RESUME upload only. Disabled "coming soon"; no invented API. When
                JD-PDF extraction is built, wire the real upload + text extraction
                here and carry the parsed text into job_description. */}
            <button
              type="button"
              disabled
              title="JD PDF upload coming soon"
              className="min-h-11 cursor-not-allowed rounded-lg border border-line-strong bg-white px-3 py-3 text-[11px] font-semibold text-midnight opacity-50"
            >
              Upload the PDF
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2.5 px-5 pb-6 pt-4">
        <p className="text-center text-[11px] leading-snug text-ink-warm">
          Still free — you&apos;ll see what changes before you pay.
        </p>
        <Button variant="progress" className="w-full" disabled={!canContinue} onClick={onContinue}>
          Choose what to optimize
        </Button>
        {!canContinue ? (
          <p className="text-center text-[11px] text-ink-faint">
            Add your job title, industry and country to continue.
          </p>
        ) : null}
      </div>
    </main>
  )
}

// Keep a Suspense boundary for future useSearchParams safety during prerender.
export default function OptimizeTargetPage() {
  return (
    <Suspense>
      <TargetScreen />
    </Suspense>
  )
}
