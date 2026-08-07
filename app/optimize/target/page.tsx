'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn, GULF_COUNTRIES, PERSONA_INDUSTRIES } from '@/lib/utils'
import { OPTIMIZATION_TARGET_DRAFT_KEY } from '@/lib/onboardingDraft'

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
 * REUSE DETECTION (contract #5): lib/reuseDetection.ts is TASK-036 (depends on
 * TASK-035 Library), not built. Deferred entirely — no fake "you already have
 * a package" prompt. Revisit when TASK-036 lands.
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
        setDraft({
          target_job_title: data?.target_job_title ?? '',
          target_industry: data?.target_industry ?? '',
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
  }, [])

  const set = useCallback(<K extends keyof TargetDraft>(key: K, value: TargetDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
  }, [])

  // Title, industry and country are required; company and JD are not.
  const canContinue =
    draft.target_job_title.trim() !== '' &&
    draft.target_industry !== '' &&
    draft.target_country !== ''

  const onContinue = useCallback(() => {
    if (!canContinue) return
    // Handoff to /optimize/setup (TASK-028 reads + clears this).
    window.sessionStorage.setItem(OPTIMIZATION_TARGET_DRAFT_KEY, JSON.stringify(draft))
    router.push('/optimize/setup')
  }, [canContinue, draft, router])

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
