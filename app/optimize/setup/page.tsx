'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { OPTIMIZATION_TARGET_DRAFT_KEY } from '@/lib/onboardingDraft'
import type { OptimizationLevel } from '@/types/package'

/**
 * Optimization setup — screen 06 (TASK-028), route /optimize/setup.
 *
 * Conversion of the "06 · Optimization setup" screen in
 * design-reference/MVP Screens.dc.html (lines 770–813): block checkboxes with
 * an "Optimize all" toggle, an informational "Skills & certifications ·
 * Automatic" row (no checkbox), three level cards defaulting to Moderate, the
 * risk indicator rendered only at Moderate/High, and a gold CTA naming the
 * target company.
 *
 * INPUT (contract #1): reads the TASK-027 handoff from sessionStorage
 * [OPTIMIZATION_TARGET_DRAFT_KEY], then CLEARS it (same read-and-clear pattern
 * TASK-024 uses). If absent, there is nothing to optimize — redirect to
 * /optimize/target (mirrors TASK-023's "no path → back" pattern).
 *
 * BLOCKS from the real profile (contract #2): GET /api/profile gives caller's
 * profileId and work_experience (id, company, role, highlights length for the
 * "N bullets" sub-label). ALL checkboxes default ON — the mockup's one
 * unchecked entry is an illustration of the feature, not a "already strong"
 * signal this app can compute. "Optimize all" sets/clears them together.
 * Skills & certifications is informational ONLY (contract #3): never touched
 * in the request body — the server always reorders skills (TASK-021).
 *
 * SUBMIT (contract #6): POST /api/optimize with the exact body being the
 * draft's target fields + selectedBlocks + level. On {success, packageId}
 * → /optimize/preview/[packageId]. On error show the server's message verbatim
 * with a way back (429 rate limit, 502 grounding/AI failure, etc. all return a
 * real {error}).
 *
 * TRANSIENT LOADING (contract #7): screen 07 (named-steps animation) is
 * TASK-029, a separate ticket. While POSTing we show a minimal honest
 * "Optimizing…" spinner with the CTA disabled — not the full animation. TASK-029
 * will replace this on the same page (screen 07 has no dedicated route).
 */

interface TargetDraft {
  target_job_title: string
  target_industry: string
  target_country: string
  target_company: string
  job_description: string
}

interface ExperienceRow {
  id: string
  label: string
  bullets: number
}

const LEVELS: ReadonlyArray<{ value: OptimizationLevel; label: string; range: string }> = [
  { value: 'easy', label: 'Easy', range: '75-80%' },
  { value: 'moderate', label: 'Moderate', range: '80-90%' },
  { value: 'high', label: 'High', range: '90-100%' },
]

const RISK_COPY =
  'A closer match raises the bar in the interview. Everything stays factual — but be ready to talk confidently about every line at this level.'

function SetupScreen() {
  const router = useRouter()
  const [draft, setDraft] = useState<TargetDraft | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [experiences, setExperiences] = useState<ExperienceRow[]>([])
  const [summaryOn, setSummaryOn] = useState(true)
  const [expOn, setExpOn] = useState<Record<string, boolean>>({})
  const [level, setLevel] = useState<OptimizationLevel>('moderate')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    // 1. Read + clear the TASK-027 handoff. Absent → nothing to optimize.
    const raw = window.sessionStorage.getItem(OPTIMIZATION_TARGET_DRAFT_KEY)
    if (!raw) {
      router.replace('/optimize/target')
      return
    }
    let parsed: TargetDraft
    try {
      parsed = JSON.parse(raw) as TargetDraft
    } catch {
      router.replace('/optimize/target')
      return
    }
    window.sessionStorage.removeItem(OPTIMIZATION_TARGET_DRAFT_KEY)
    setDraft(parsed)

    // 2. Load profileId + work_experience for the block list.
    fetch('/api/profile', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        const list: Array<{
          id?: string
          company?: string
          role?: string
          highlights?: string[] | null
        }> = Array.isArray(data?.work_experience) ? data.work_experience : []
        const rows: ExperienceRow[] = list
          .filter((e) => typeof e.id === 'string' && e.id !== '')
          .map((e) => ({
            id: e.id as string,
            label: [e.company, e.role].filter(Boolean).join(' — '),
            bullets: Array.isArray(e.highlights) ? e.highlights.length : 0,
          }))
        setProfileId(typeof data?.id === 'string' ? (data.id as string) : null)
        setExperiences(rows)
        const allOn: Record<string, boolean> = {}
        for (const r of rows) allOn[r.id] = true
        setExpOn(allOn)
      })
      .catch(() => {
        // Non-fatal loading: leave blocks empty; the CTA still works for the
        // summary-only path, but the server will 404 if profileId is missing.
        setProfileId(null)
      })
  }, [router])

  const allOn = experiences.length === 0 || experiences.every((e) => expOn[e.id])

  const toggleAll = useCallback(() => {
    setExpOn((prev) => {
      const next: Record<string, boolean> = {}
      for (const e of experiences) next[e.id] = !allOn
      return next
    })
  }, [experiences, allOn])

  const toggleExp = useCallback((id: string) => {
    setExpOn((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const ctaName =
    draft && draft.target_company.trim() !== '' ? draft.target_company.trim() : draft?.target_job_title ?? ''

  const onSubmit = useCallback(async () => {
    if (!draft || !profileId || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const body = {
        profileId,
        targetFields: {
          target_job_title: draft.target_job_title,
          target_industry: draft.target_industry,
          target_country: draft.target_country,
          target_company: draft.target_company.trim() !== '' ? draft.target_company : null,
        },
        jobDescription: draft.job_description.trim() !== '' ? draft.job_description : null,
        selectedBlocks: {
          summary: summaryOn,
          experienceIds: experiences.filter((e) => expOn[e.id]).map((e) => e.id),
        },
        level,
      }
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const responseBody = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((responseBody?.error as string) ?? 'Could not start optimization. Please try again.')
        setSubmitting(false)
        return
      }
      if (responseBody?.success && responseBody?.packageId) {
        router.push(`/optimize/preview/${(responseBody.packageId as string).replace(/[^a-zA-Z0-9-]/g, '')}`)
        return
      }
      setError('Unexpected response from the server.')
      setSubmitting(false)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setSubmitting(false)
    }
  }, [draft, profileId, submitting, summaryOn, experiences, expOn, level, router])

  // Waiting for the draft handoff / profile load.
  if (!draft) {
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

      {/* Back + heading */}
      <div className="flex flex-col gap-2 px-5 pb-4 pt-1.5">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-lg text-[20px] leading-none text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
        >
          ←
        </button>
        <h1 className="font-serif text-[27px] leading-tight text-midnight">What should we sharpen?</h1>
        <p className="text-[12px] leading-normal text-ink-body">
          Your dates, employers, titles and certifications are never touched. Only framing changes.
        </p>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5">
        {/* Blocks */}
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-warm">Blocks</div>
          <button
            type="button"
            aria-pressed={allOn}
            onClick={toggleAll}
            className={cn(
              'rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
              allOn
                ? 'border-gold-line bg-state-gold-bg text-state-gold-text'
                : 'border-line bg-white text-ink-body'
            )}
          >
            Optimize all
          </button>
        </div>

        {/* Professional summary */}
        <button
          type="button"
          onClick={() => setSummaryOn((v) => !v)}
          aria-pressed={summaryOn}
          className={cn(
            'flex min-h-11 items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2',
            summaryOn ? 'border-emerald' : 'border-line'
          )}
        >
          <span
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-[6px] text-[11px] text-white',
              summaryOn ? 'bg-emerald' : 'border-[1.5px] border-line-strong'
            )}
          >
            {summaryOn ? '✓' : ''}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold text-midnight">Professional summary</span>
            <span className="text-[11px] text-ink-warm">Rewritten for this target</span>
          </span>
        </button>

        {/* Work experience entries */}
        {experiences.map((e) => {
          const on = !!expOn[e.id]
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => toggleExp(e.id)}
              aria-pressed={on}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2',
                on ? 'border-emerald' : 'border-line'
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-[6px] text-[11px] text-white',
                  on ? 'bg-emerald' : 'border-[1.5px] border-line-strong'
                )}
              >
                {on ? '✓' : ''}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-midnight">{e.label}</span>
                <span className="text-[11px] text-ink-warm">
                  {e.bullets} bullet{e.bullets === 1 ? '' : 's'}
                </span>
              </span>
            </button>
          )
        })}

        {/* Skills & certifications — informational only, no checkbox */}
        <div className="flex min-h-11 items-center justify-between rounded-xl border border-line bg-fill-subtle px-4 py-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold text-midnight">Skills &amp; certifications</span>
            <span className="text-[11px] text-ink-warm">Reordered by relevance — never reworded</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald">Automatic</span>
        </div>

        {/* Optimization level */}
        <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-warm">
          Optimization level
        </div>
        <div className="flex gap-[7px]">
          {LEVELS.map((l) => {
            const selected = level === l.value
            return (
              <button
                key={l.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setLevel(l.value)}
                className={cn(
                  'flex min-h-11 flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2',
                  selected
                    ? 'border-midnight bg-midnight'
                    : 'border-line bg-white'
                )}
              >
                <span className={cn('text-[13px] font-semibold', selected ? 'text-marble' : 'text-midnight')}>
                  {l.label}
                </span>
                <span className={cn('font-mono text-[10px]', selected ? 'text-gold-light' : 'text-ink-warm')}>
                  {l.range}
                </span>
              </button>
            )
          })}
        </div>

        {/* Risk indicator — ONLY at Moderate/High */}
        {level !== 'easy' ? (
          <div className="mt-1 flex items-start gap-2.5 rounded-xl border border-state-terra-line bg-state-terra-bg px-3.5 py-3">
            <span className="text-[13px] text-terracotta">△</span>
            <p className="text-[11px] leading-snug text-state-terra-text">{RISK_COPY}</p>
          </div>
        ) : null}
      </div>

      {/* Footer CTA */}
      {error ? (
        <div className="mx-5 mb-3 rounded-xl border border-terracotta/30 bg-state-terra-bg px-3.5 py-3 text-[12px] text-state-terra-text">
          {error}
        </div>
      ) : null}
      <div className="flex flex-col gap-2.5 px-5 pb-6 pt-4">
        <Button
          variant="purchase"
          className="w-full"
          disabled={submitting || !profileId}
          onClick={onSubmit}
        >
          {submitting ? 'Optimizing…' : `Optimize for ${ctaName}`}
        </Button>
        {error ? (
          <Button variant="secondary" className="w-full" onClick={() => router.push('/optimize/target')}>
            Back to choose target
          </Button>
        ) : null}
      </div>
    </main>
  )
}

// Keep a Suspense boundary for future useSearchParams safety during prerender.
export default function OptimizeSetupPage() {
  return (
    <Suspense>
      <SetupScreen />
    </Suspense>
  )
}
