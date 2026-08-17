'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { OPTIMIZATION_REPLACE_PACKAGE_KEY, OPTIMIZATION_TARGET_DRAFT_KEY } from '@/lib/onboardingDraft'
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
 * TRANSIENT STATE — screen 07 (TASK-029): while POSTing, the whole screen
 * swaps to the dark-navy named-steps "Optimizing…" layout (no dedicated route;
 * it is a transient state on this same page, per docs/USER_FLOW.md Step 7
 * having no Route: line). Steps are dynamic from what was selected; progress is
 * a client-side timer paced at 60s, since POST /api/optimize is single-shot
 * (no server-sent per-step progress). On success we still navigate to the
 * preview; on error we return to the form with the server's message.
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
  company: string
  label: string
  bullets: number
}

// Short display labels derived from each persona's actual ROLE framing in
// lib/ai/personas.ts (TASK-018/019) — the full persona strings are AI
// system-prompt paragraphs, never rendered verbatim. Anything without a
// dedicated persona (incl. "other" and free-text industries) uses the generic
// Gulf specialist framing, matching getPersona's fallback.
function personaLabel(industry: string): string {
  switch (industry) {
    case 'engineering_technical':
      return 'a senior I&C hiring manager'
    case 'construction_site':
      return 'a senior Construction Manager'
    case 'it_tech':
      return 'a senior Engineering Manager'
    default:
      return 'a senior Gulf-market recruitment specialist'
  }
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
  const [loadError, setLoadError] = useState<string | null>(null)
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
            company: e.company ?? '',
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
        // FATAL for this screen, not non-fatal: the CTA is disabled whenever
        // profileId is null (POST /api/optimize requires it and 404s
        // otherwise), so a failed load must not leave the user staring at a
        // fully-rendered form with a permanently disabled button and no
        // explanation. Surface a visible error with a way back instead.
        setProfileId(null)
        setLoadError('Could not load your profile. Please go back and try again.')
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
          // Optional (migration 030) — empty means null, same convention as
          // target_company right below (an empty string would otherwise fail
          // the server's enum check).
          target_country: draft.target_country.trim() !== '' ? draft.target_country : null,
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
        const newPackageId = (responseBody.packageId as string).replace(/[^a-zA-Z0-9-]/g, '')
        // Reuse-detection re-optimize (TASK-036): delete the OLD package ONLY
        // now that the new package is confirmed created — never before, so a
        // failed generation can't destroy the user's existing content for
        // nothing. Best-effort: never block navigation on this cleanup.
        const replaceId = window.sessionStorage.getItem(OPTIMIZATION_REPLACE_PACKAGE_KEY)
        window.sessionStorage.removeItem(OPTIMIZATION_REPLACE_PACKAGE_KEY)
        if (replaceId) {
          await fetch(`/api/packages/${encodeURIComponent(replaceId)}`, { method: 'DELETE' }).catch(
            () => {
              /* swallow — the new resume exists; old-package cleanup is best-effort */
            }
          )
        }

        // This call does not produce a resume — it creates an empty package.
        // Generation is the next screen.
        //
        // The payment step between the two is gone while the locks are off
        // (founder decision 2026-08-17). The server still answers
        // `requiresPayment`, always false for now, so the step can be put back
        // without changing this contract.
        if (responseBody?.requiresPayment) {
          router.push(`/optimize/pay/${newPackageId}`)
          return
        }
        router.push(`/optimize/generate/${newPackageId}`)
        return
      }
      setError('Unexpected response from the server.')
      setSubmitting(false)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setSubmitting(false)
    }
  }, [draft, profileId, submitting, summaryOn, experiences, expOn, level, router])

  // ---- Screen 07 "Optimizing…" transient state (TASK-029) -----------------
  // Dynamic named steps, built ONLY from what was actually selected — never
  // claiming work that isn't happening (the grounding ethos applies to this UI
  // too). JD-match step appears only when a JD was pasted; summary step only
  // when summaryOn; one "Rewriting {company} bullets" per checked experience;
  // skills + country steps are always on (server always reorders skills —
  // TASK-021). If nothing but the two always-on steps is selected, that is
  // fine — no special case (Unplanned #15).
  const [elapsedMs, setElapsedMs] = useState(0)

  const steps = useMemo(() => {
    if (!draft) return []
    const list: string[] = []
    if (draft.job_description.trim() !== '') {
      list.push(`Matched JD language for ${draft.target_job_title}`)
    }
    if (summaryOn) list.push('Reframed your summary')
    for (const e of experiences) if (expOn[e.id]) list.push(`Rewriting ${e.company} bullets`)
    list.push('Reordering skills by relevance')
    // Always "Gulf CV format" (migration 030) — the format has never
    // actually varied by target_country (lib/ai/buildOptimizationPrompt.ts's
    // GULF_FORMAT_NOTE is one country-agnostic convention), so naming a
    // specific country here implied a variation that doesn't exist.
    list.push('Applying Gulf CV format')
    return list
  }, [draft, summaryOn, experiences, expOn])

  // Non-streaming reality (same as TASK-023): POST /api/optimize is single-shot,
  // no per-step server progress. Advance the steps client-side, paced at
  // 60s/stepCount. The interval is cleared when submitting resets (error) or on
  // unmount (success → navigation), so it never leaks.
  useEffect(() => {
    if (!submitting) return
    const start = Date.now()
    setElapsedMs(0)
    const id = window.setInterval(() => setElapsedMs(Date.now() - start), 200)
    return () => window.clearInterval(id)
  }, [submitting])

  const stepMs = steps.length > 0 ? 60000 / steps.length : 60000
  const activeIndex = Math.min(steps.length - 1, Math.floor(elapsedMs / stepMs))
  const percent = Math.min(100, Math.round((elapsedMs / 60000) * 100))
  const secsLeft = Math.max(0, Math.round((60000 - elapsedMs) / 1000))

  // Waiting for the draft handoff / profile load.
  if (!draft) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="font-mono text-sm text-ink-400">Loading…</p>
      </main>
    )
  }

  // Screen 07 — full dark-navy stage swap while POSTing (replaces the old
  // CTA-text change). Same in-one-file stage-swap pattern TASK-023 used for
  // collect → extracting. On success the onSubmit navigation unmounts this;
  // on error it resets submitting → back to the form below.
  if (submitting) {
    return (
      <main className="flex min-h-dvh flex-col bg-forest-deep font-redesign-sans">
        <div className="flex flex-1 flex-col justify-center gap-6 px-6">
          <div className="flex flex-col gap-2.5 text-center">
            <h1 className="font-serif text-[30px] leading-tight text-ink-900-dark">
              Optimizing for
              <span className="block text-gold-text-dark">{ctaName}</span>
            </h1>
            <p className="text-[13px] leading-relaxed text-ink-400-dark">
              Reviewed as {personaLabel(draft.target_industry)} would.
            </p>
          </div>

          {/* Named steps — dynamic, only what was selected */}
          <div className="flex flex-col gap-3.5 rounded-radius-lg border border-ink-900-dark/20 bg-ink-900-dark/10 p-5">
            {steps.map((s, i) => {
              const isDone = i < activeIndex
              const isActive = i === activeIndex
              const icon = isDone ? '✓' : isActive ? '◍' : '○'
              const iconColor = isDone
                ? 'text-forest-dark'
                : isActive
                  ? 'text-gold-text-dark'
                  : 'text-ink-400-dark'
              return (
                <div key={s} className="flex items-center gap-3 text-[13px] font-medium">
                  <span className={cn('w-4 shrink-0 text-center', iconColor)}>{icon}</span>
                  <span className={isDone || isActive ? 'text-ink-900-dark' : 'text-ink-400-dark'}>{s}</span>
                </div>
              )
            })}
          </div>

          {/* Progress: % and ~Ns left from elapsed vs the 60s target */}
          <div className="flex flex-col gap-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900-dark/10">
              <div
                className="h-full rounded-full bg-redesign-gold transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-[11px] text-ink-400-dark">
              <span>{percent}%</span>
              <span>~{secsLeft}s left</span>
            </div>
          </div>

          <p className="text-center text-[11px] leading-relaxed text-ink-400-dark">
            Only facts already in your profile are used. Nothing is invented.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col font-redesign-sans">
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-5 py-8 sm:px-8 lg:py-12">
      {/* Back + heading */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-radius-md text-[20px] leading-none text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2"
        >
          ←
        </button>
        <h1 className="font-serif text-[27px] leading-tight text-ink-900">What should we sharpen?</h1>
        <p className="text-[12px] leading-normal text-ink-700">
          Your dates, employers, titles and certifications are never touched. Only framing changes.
        </p>
      </div>

      {loadError ? (
        <div className="mx-5 mb-3 flex flex-col gap-3 rounded-radius-lg border border-terra/30 bg-terra-tint px-3.5 py-3">
          <p className="text-[12px] text-terra">{loadError}</p>
          <Button variant="secondary" className="w-full" onClick={() => router.push('/optimize/target')}>
            Back to choose target
          </Button>
        </div>
      ) : null}

      {/* Body */}
      <Card tone="light" className="mt-5 flex flex-1 flex-col gap-2.5 overflow-y-auto p-5">
        {/* Blocks */}
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">Blocks</div>
          <button
            type="button"
            aria-pressed={allOn}
            onClick={toggleAll}
            className={cn(
              'rounded-radius-md border px-3 py-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2',
              allOn
                ? 'border-redesign-gold/50 bg-redesign-gold-tint text-gold-text'
                : 'border-line-light bg-surface-light text-ink-700'
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
            'flex min-h-11 items-center gap-3 rounded-radius-lg border bg-surface-light px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2',
            summaryOn ? 'border-forest' : 'border-line-light'
          )}
        >
          <span
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-[6px] text-[11px] text-white',
              summaryOn ? 'bg-forest' : 'border-[1.5px] border-line-light-strong'
            )}
          >
            {summaryOn ? '✓' : ''}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold text-ink-900">Professional summary</span>
            <span className="text-[11px] text-ink-400">Rewritten for this target</span>
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
                'flex min-h-11 items-center gap-3 rounded-radius-lg border bg-surface-light px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2',
                on ? 'border-forest' : 'border-line-light'
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-[6px] text-[11px] text-white',
                  on ? 'bg-forest' : 'border-[1.5px] border-line-light-strong'
                )}
              >
                {on ? '✓' : ''}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-ink-900">{e.label}</span>
                <span className="text-[11px] text-ink-400">
                  {e.bullets} bullet{e.bullets === 1 ? '' : 's'}
                </span>
              </span>
            </button>
          )
        })}

        {/* Skills & certifications — informational only, no checkbox */}
        <div className="flex min-h-11 items-center justify-between rounded-radius-lg border border-line-light bg-surface-2-light px-4 py-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold text-ink-900">Skills &amp; certifications</span>
            <span className="text-[11px] text-ink-400">Reordered by relevance — never reworded</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-forest">Automatic</span>
        </div>

        {/* Optimization level */}
        <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
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
                  'flex min-h-11 flex-1 flex-col items-center gap-1 rounded-radius-lg border px-2 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2',
                  selected
                    ? 'border-redesign-gold bg-forest-deep'
                    : 'border-line-light bg-surface-light'
                )}
              >
                <span className={cn('text-[13px] font-semibold', selected ? 'text-ink-900' : 'text-ink-900')}>
                  {l.label}
                </span>
                <span className={cn('font-mono text-[10px]', selected ? 'text-gold-text' : 'text-ink-400')}>
                  {l.range}
                </span>
              </button>
            )
          })}
        </div>

        {/* Risk indicator — ONLY at Moderate/High */}
        {level !== 'easy' ? (
          <div className="mt-1 flex items-start gap-2.5 rounded-radius-lg border border-terra/40 bg-terra-tint px-3.5 py-3">
            <span className="text-[13px] text-terra">△</span>
            <p className="text-[11px] leading-snug text-terra">{RISK_COPY}</p>
          </div>
        ) : null}
      </Card>

      {/* Footer CTA */}
      {error ? (
        <div className="mx-5 mb-3 rounded-radius-lg border border-terra/30 bg-terra-tint px-3.5 py-3 text-[12px] text-terra">
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
      </div>
    </main>
  )
}

// Keep a Suspense boundary for future useSearchParams safety during prerender.
export default function OptimizeSetupPage() {
  return (
    <AppShell>
      <Suspense>
        <SetupScreen />
      </Suspense>
    </AppShell>
  )
}
