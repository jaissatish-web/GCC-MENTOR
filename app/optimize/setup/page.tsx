'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ProcessingOrbit, ProcessingSteps } from '@/components/ui/Processing'
import { setupNotes } from '@/lib/processingNotes'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utils'
import {
  OPTIMIZATION_BUILD_STEPS_KEY,
  OPTIMIZATION_REPLACE_PACKAGE_KEY,
  OPTIMIZATION_TARGET_DRAFT_KEY,
} from '@/lib/onboardingDraft'
import type { OptimizationLevel } from '@/types/package'
import { Alert } from '@/components/ui/Alert'
import { CTA, NAMES } from '@/lib/serviceLabels'

/**
 * Step 2 of 3 — choose the optimization level. Route /optimize/setup.
 *
 * REBUILT 2026-09-17 (founder decision): NO SCORE BEFORE OPTIMIZING.
 * This screen used to call POST /api/optimize/analyze on arrival and show a
 * match report, per-level projections and "do you have these?" tick boxes
 * before anything was built. The founder's flow is simpler: the user gives the
 * target job (step 1), chooses a level (here), and sees the ATS score BEFORE
 * and AFTER together with the optimized CV on the result page. So this screen
 * makes no AI call. The analysis runs once, inside the build
 * (app/api/optimize/route.ts Phase B → resolveAnalysis), which is the same
 * number of calls for a finished CV and none for a user who stops here.
 *
 * INPUT: the step-1 draft in sessionStorage [OPTIMIZATION_TARGET_DRAFT_KEY].
 * It is kept (not cleared) until the optimization starts, so "Change" returns to
 * step 1 with the title and description still filled in. Absent → step 1.
 *
 * SUBMIT: POST /api/optimize (Phase A — creates the package, no model call),
 * then /optimize/generate/[packageId] runs the build. Every part of the CV that
 * the AI may rewrite (summary + each role's activities) is selected by default;
 * the choice is behind "Choose which parts to rewrite" for the few who want it.
 */

interface TargetDraft {
  target_job_title: string
  target_industry: string
  job_description: string
}

interface ExperienceRow {
  id: string
  company: string
  label: string
}

// Each level states the ATS score band it aims for
// (lib/optimizer/suggestions.ts LEVEL_TARGET_BAND).
const LEVELS: ReadonlyArray<{ value: OptimizationLevel; label: string; aim: string; explain: string }> = [
  {
    value: 'easy',
    label: 'Easy',
    aim: 'Aims for 60–75',
    explain: 'Rewrites your summary and work activities in the job’s keywords, using only what your profile already says.',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    aim: 'Aims for 75–85',
    explain:
      'Everything in Easy, plus suggested lines and skills for the must-have requirements your profile doesn’t mention. They appear in yellow on the review page — keep only what is true.',
  },
  {
    value: 'high',
    label: 'High',
    aim: 'Aims for 85–95',
    explain:
      'The strongest rewrite, plus suggested lines and skills for every requirement your profile doesn’t mention, shown in yellow on the review page. Keep only what is true — be ready to talk about every line in an interview.',
  },
]

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
  const [showDescription, setShowDescription] = useState(false)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

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
    if (typeof parsed?.target_job_title !== 'string' || parsed.target_job_title.trim() === '') {
      router.replace('/optimize/target')
      return
    }
    setDraft({
      target_job_title: parsed.target_job_title,
      target_industry: typeof parsed.target_industry === 'string' ? parsed.target_industry : '',
      job_description: typeof parsed.job_description === 'string' ? parsed.job_description : '',
    })

    fetch('/api/profile', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        const list: Array<{ id?: string; company?: string; role?: string }> = Array.isArray(data?.work_experience)
          ? data.work_experience
          : []
        const rows: ExperienceRow[] = list
          .filter((e) => typeof e.id === 'string' && e.id !== '')
          .map((e) => ({
            id: e.id as string,
            company: e.company ?? '',
            label: [e.role, e.company].filter(Boolean).join(' · '),
          }))
        setProfileId(typeof data?.id === 'string' ? (data.id as string) : null)
        setExperiences(rows)
        const allOn: Record<string, boolean> = {}
        for (const r of rows) allOn[r.id] = true
        setExpOn(allOn)
      })
      .catch(() => {
        setProfileId(null)
        setLoadError('Could not load your Career Profile. Please go back and try again.')
      })
  }, [router])

  const selectedIds = useMemo(() => experiences.filter((e) => expOn[e.id]).map((e) => e.id), [experiences, expOn])
  const nothingSelected = !summaryOn && selectedIds.length === 0
  const allSelected = summaryOn && selectedIds.length === experiences.length
  const hasJobDescription = !!draft && draft.job_description.trim() !== ''

  // Named steps for the build screen, from what is selected.
  const buildSteps = useMemo(() => {
    if (!draft) return []
    const list: string[] = [
      hasJobDescription ? 'Reading the job description' : `Working out what ${draft.target_job_title} roles ask for`,
      'Scoring your current CV (before)',
    ]
    if (summaryOn) list.push('Rewriting your summary')
    for (const e of experiences) if (expOn[e.id]) list.push(`Rewriting your activities at ${e.company || 'this role'}`)
    list.push('Ordering skills by relevance')
    list.push('Checking every line against your Career Profile')
    list.push('Scoring your optimized CV (after)')
    return Array.from(new Set(list))
  }, [draft, hasJobDescription, summaryOn, experiences, expOn])

  const onSubmit = useCallback(async () => {
    if (!draft || !profileId || submitting || nothingSelected) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          targetFields: {
            target_job_title: draft.target_job_title,
            target_industry: draft.target_industry.trim() !== '' ? draft.target_industry : null,
          },
          jobDescription: hasJobDescription ? draft.job_description : null,
          selectedBlocks: { summary: summaryOn, experienceIds: selectedIds },
          level,
          analysisId: null,
        }),
      })
      const responseBody = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((responseBody?.error as string) ?? 'Could not start the optimization. Please try again.')
        setSubmitting(false)
        return
      }
      if (responseBody?.success && responseBody?.packageId) {
        const newPackageId = (responseBody.packageId as string).replace(/[^a-zA-Z0-9-]/g, '')
        window.sessionStorage.removeItem(OPTIMIZATION_TARGET_DRAFT_KEY)
        try {
          window.sessionStorage.setItem(
            OPTIMIZATION_BUILD_STEPS_KEY,
            JSON.stringify({ packageId: newPackageId, steps: buildSteps }),
          )
        } catch {
          /* generate falls back to its generic steps */
        }
        // Replace an older CV for the same job only now that the new one exists.
        const replaceId = window.sessionStorage.getItem(OPTIMIZATION_REPLACE_PACKAGE_KEY)
        window.sessionStorage.removeItem(OPTIMIZATION_REPLACE_PACKAGE_KEY)
        if (replaceId) {
          await fetch(`/api/packages/${encodeURIComponent(replaceId)}`, { method: 'DELETE' }).catch(() => {
            /* best-effort: the new CV exists */
          })
        }
        router.push(
          responseBody?.requiresPayment ? `/optimize/pay/${newPackageId}` : `/optimize/generate/${newPackageId}`,
        )
        return
      }
      setError('Unexpected response from the server.')
      setSubmitting(false)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setSubmitting(false)
    }
  }, [draft, profileId, submitting, nothingSelected, hasJobDescription, summaryOn, selectedIds, level, router, buildSteps])

  if (!draft) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <PageSkeleton label="Loading your profile" />
      </main>
    )
  }

  // Phase A is a row insert — a short wait.
  if (submitting) {
    return (
      <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink font-redesign-sans">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_26%,rgba(201,150,46,0.16),transparent_70%)]"
        />
        <div className="relative mx-auto flex w-full max-w-[460px] flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
          <ProcessingOrbit tone="dark" size={168} />
          <h1 className="text-center font-display text-[30px] leading-tight text-white">
            Saving your target job
            <span className="block text-gold">{draft.target_job_title}</span>
          </h1>
          <ProcessingSteps
            tone="dark"
            steps={['Saving your target job', 'Starting the optimization']}
            activeIndex={0}
            notes={setupNotes(hasJobDescription)}
          />
        </div>
      </main>
    )
  }

  const levelInfo = LEVELS.find((l) => l.value === level) ?? LEVELS[1]

  return (
    <main className="flex min-h-dvh flex-col font-redesign-sans">
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-5 px-3 py-8 sm:px-8 lg:py-12">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            aria-label="Back to target job"
            onClick={() => router.push('/optimize/target')}
            className="flex size-11 items-center justify-center rounded-ctl text-[20px] leading-none text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
          >
            ←
          </button>
          <div className="flex-1">
            <ProgressBar value={67} tone="light" />
          </div>
          <span className="font-mono text-[12px] text-ink-muted">Step 2 of 3</span>
        </div>

        <div>
          <h1 className="font-display text-[27px] leading-tight text-ink">Choose your {NAMES.level.toLowerCase()}</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            Your employers, job titles, dates and education never change. Only your summary and work activities are
            rewritten.
          </p>
        </div>

        {loadError ? <Alert variant="danger">{loadError}</Alert> : null}

        {/* 1. What we are optimizing for */}
        <Card tone="light" className="flex flex-col gap-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">{NAMES.targetJob}</p>
              <p className="mt-0.5 break-words font-display text-[19px] leading-tight text-ink">{draft.target_job_title}</p>
              <p className="mt-1 text-[12.5px] text-ink-soft">
                {hasJobDescription
                  ? `${NAMES.jobDescription} added`
                  : `No ${NAMES.jobDescription.toLowerCase()} — the ATS score will be an estimate`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/optimize/target')}
              className="min-h-11 shrink-0 px-2 text-[13px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              Change
            </button>
          </div>
          {hasJobDescription ? (
            <>
              <button
                type="button"
                aria-expanded={showDescription}
                onClick={() => setShowDescription((v) => !v)}
                className="min-h-11 self-start text-[13px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                {showDescription ? 'Hide job description' : 'Show job description'}
              </button>
              {showDescription ? (
                <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-ctl border border-line bg-canvas p-3 text-[13px] leading-relaxed text-ink-soft">
                  {draft.job_description}
                </div>
              ) : null}
            </>
          ) : null}
        </Card>

        {/* 2. The level */}
        <Card tone="light" className="flex flex-col gap-3 p-5">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">{NAMES.level}</p>
          <div role="radiogroup" aria-label={NAMES.level} className="grid grid-cols-3 gap-2">
            {LEVELS.map((l) => {
              const selected = level === l.value
              return (
                <button
                  key={l.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setLevel(l.value)}
                  className={cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1 rounded-card border px-2 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
                    selected ? 'border-teal bg-teal' : 'border-line bg-white hover:bg-canvas',
                  )}
                >
                  <span className={cn('text-[14px] font-semibold', selected ? 'text-white' : 'text-ink')}>{l.label}</span>
                  <span className={cn('text-[12px]', selected ? 'text-teal-soft' : 'text-ink-muted')}>{l.aim}</span>
                </button>
              )
            })}
          </div>
          <Alert variant={level === 'easy' ? 'info' : 'warning'}>{levelInfo.explain}</Alert>

          {/* Parts to rewrite — all by default, adjustable. */}
          <details className="group rounded-ctl border border-line bg-canvas px-3 py-2">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-semibold text-ink">
              <span>Choose which parts to rewrite</span>
              <span className="text-[12px] font-normal text-ink-muted">
                {allSelected ? 'All selected' : nothingSelected ? 'None selected' : 'Some selected'}
              </span>
            </summary>
            <div className="flex flex-col gap-2 pb-2 pt-1">
              <PartToggle label="Professional summary" on={summaryOn} onToggle={() => setSummaryOn((v) => !v)} />
              {experiences.map((e) => (
                <PartToggle
                  key={e.id}
                  label={e.label || 'Work experience'}
                  on={!!expOn[e.id]}
                  onToggle={() => setExpOn((prev) => ({ ...prev, [e.id]: !prev[e.id] }))}
                />
              ))}
              <p className="text-[12px] text-ink-muted">Skills are put in order of relevance, never reworded.</p>
            </div>
          </details>
        </Card>

        {/* 3. What you get */}
        <div className="rounded-card border border-teal/30 bg-teal-soft/50 px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
          <strong className="text-ink">You will see:</strong> your {NAMES.atsScore} before and after for this target job,
          and your {NAMES.optimizedCv.toLowerCase()}, saved in your {NAMES.library}.
        </div>

        {error ? <Alert variant="danger">{error}</Alert> : null}
        {nothingSelected ? (
          <p className="text-center text-[12px] text-ink-muted">Select the summary or at least one role to rewrite.</p>
        ) : null}

        <Button
          variant="purchase"
          className="w-full"
          disabled={submitting || !profileId || nothingSelected}
          onClick={onSubmit}
        >
          {CTA.optimizeCv}
        </Button>
      </div>
    </main>
  )
}

function PartToggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-card border bg-white px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
        on ? 'border-teal' : 'border-line',
      )}
    >
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-[6px] text-[12px] text-white',
          on ? 'bg-teal' : 'border-[1.5px] border-line-strong',
        )}
      >
        {on ? '✓' : ''}
      </span>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
    </button>
  )
}

export default function OptimizeSetupPage() {
  return (
    <Suspense>
      <SetupScreen />
    </Suspense>
  )
}
