'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/Button'
import { CheckIcon } from '@heroicons/react/24/outline'
import { ProcessingOrbit, ProcessingSteps } from '@/components/ui/Processing'
import { setupNotes } from '@/lib/processingNotes'
import { Card } from '@/components/ui/Card'
import { FlowHeader } from '@/components/optimizer/FlowHeader'
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
 * OPTIMIZER v3 (2026-10-02, founder decision) supersedes the note below: the
 * screen now CHECKS THE JOB on arrival (POST /api/optimize/check — one cached
 * analysis the build reuses) and shows the field match, the honest best score
 * per level and certificates to ask about. The check must finish before the
 * user explicitly chooses a level; the first time, they agree before Moderate/High.
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
  /** False for a job listed with no duties (nothing to reword). */
  hasDuties: boolean
}

// Each level states the ATS score band it aims for
// (lib/optimizer/suggestions.ts LEVEL_TARGET_BAND).
// `changes` says the same thing as `explain`, as short lines a user can scan
// (2026-09-23). The behaviour behind each level is unchanged.
const LEVELS: ReadonlyArray<{
  value: OptimizationLevel
  label: string
  aim: string
  tag: string
  changes: readonly string[]
  explain: string
}> = [
  // Optimizer v3: Moderate is recommended; the user chooses a level explicitly;
  // added points are duties typical of the candidate's OWN field — never
  // certificates, education, employers, titles, dates or personal details.
  {
    value: 'easy',
    label: 'Easy',
    aim: 'Uses only what your profile says',
    tag: 'Light touch',
    changes: [
      'Summary and work activities reworded in the job’s keywords',
      'Uses only what your profile already says',
      'Adds nothing new',
    ],
    explain: 'Rewrites your summary and work activities in the job’s keywords, using only what your profile already says.',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    aim: 'Adds duties typical of your field',
    tag: 'Recommended',
    changes: [
      'Everything in Easy, rewritten to lead with what this job needs',
      'Suggests relevant duties separately for your confirmation',
      'Never adds certificates, dates, companies or personal details',
    ],
    explain:
      'Everything in Easy, plus separate suggestions for relevant duties. Suggestions enter your resume only after you confirm them. Certificates, education, employers, dates and personal details are never added or changed.',
  },
  {
    value: 'high',
    label: 'High',
    aim: 'Every line in the job’s own words',
    tag: 'Strongest',
    changes: [
      'Every activity rewritten in the job’s own language',
      'Offers additional duties for your review; none is assumed',
      'Asks which of the job’s tools and skills you really have, and adds them',
    ],
    explain:
      'The strongest rewrite, in the job description’s own words, plus points for every duty of the job that is typical of your field. Be ready to talk about every line in an interview.',
  },
]

interface JobCheck {
  mode: 'job_description' | 'target_title_only'
  fieldMatch: 'same' | 'related' | 'different'
  jobField: string
  candidateField: string
  before: number
  expected: Record<OptimizationLevel, number>
  askCertifications: Array<{ term: string; importance: 'must' | 'nice'; gain: number }>
  /** High's tick-list: tools, standards, skills the job lists that the profile does not show. */
  askSkills?: Array<{ term: string; importance: 'must' | 'nice'; gain: number }>
  /** High's best score if the user has every skill and certificate the job asks for. */
  highIfConfirmed?: number
  /** No advert pasted: matched against the typical Gulf advert for the title. */
  typical?: boolean
  typicalAdvert?: string
}

function SetupScreen() {
  const router = useRouter()
  const [draft, setDraft] = useState<TargetDraft | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [experiences, setExperiences] = useState<ExperienceRow[]>([])
  const [summaryOn, setSummaryOn] = useState(true)
  const [expOn, setExpOn] = useState<Record<string, boolean>>({})
  const [level, setLevel] = useState<OptimizationLevel>('moderate')
  const [levelSelected, setLevelSelected] = useState(false)
  const [skillsPending, setSkillsPending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showDescription, setShowDescription] = useState(false)
  // Optimizer v3: the job check, and the first-time agreement.
  const [check, setCheck] = useState<JobCheck | null>(null)
  const [checkState, setCheckState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [firstTime, setFirstTime] = useState(false)
  const [consented, setConsented] = useState(true)
  const [agreed, setAgreed] = useState(false)
  const didInit = useRef(false)
  const lastCheck = useRef(-1)
  const [checkRun, setCheckRun] = useState(0)

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
        const list: Array<{ id?: string; company?: string; role?: string; highlights?: string[] | null; description?: string | null }> = Array.isArray(data?.work_experience)
          ? data.work_experience
          : []
        const rows: ExperienceRow[] = list
          .filter((e) => typeof e.id === 'string' && e.id !== '')
          .map((e) => ({
            id: e.id as string,
            company: e.company ?? '',
            label: [e.role, e.company].filter(Boolean).join(' · '),
            hasDuties: (e.highlights ?? []).some((h) => h.trim() !== '') || !!e.description?.trim(),
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

  // CHECK THIS JOB (optimizer v3, 2026-10-02). One analysis, cached and reused
  // by the build — so it runs while the user reads the levels and the build
  // then only writes. Optimization waits for a successful check and a level choice.
  // checkRun goes up when the user adds a certificate here: the check runs again
  // (no model call — lib/optimizer/v3/service.ts regroups the cached analysis)
  // and optimization stays disabled until the updated scores are ready.
  useEffect(() => {
    if (!draft || !profileId || lastCheck.current === checkRun) return
    lastCheck.current = checkRun
    setCheckState('loading')
    fetch('/api/optimize/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId,
        targetFields: { target_job_title: draft.target_job_title, target_industry: draft.target_industry.trim() || null },
        jobDescription: draft.job_description.trim() || null,
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (!data.check?.expected) throw new Error('Missing job check')
        setCheck(data.check as JobCheck)
        setFirstTime(!!data.firstTime)
        setConsented(!!data.consented)
        setCheckState('done')
      })
      .catch(() => {
        setCheckState('error')
      })
  }, [draft, profileId, checkRun])

  const selectedIds = useMemo(() => experiences.filter((e) => expOn[e.id]).map((e) => e.id), [experiences, expOn])
  const nothingSelected = !summaryOn && selectedIds.length === 0
  const allSelected = summaryOn && selectedIds.length === experiences.length
  const hasJobDescription = !!draft && draft.job_description.trim() !== ''

  // Named steps for the build screen, from what is selected.
  const buildSteps = useMemo(() => {
    if (!draft) return []
    const list: string[] = [
      hasJobDescription ? 'Reading the job description' : `Working out what ${draft.target_job_title} roles ask for`,
      'Scoring your current resume (before)',
    ]
    if (summaryOn) list.push('Rewriting your summary')
    for (const e of experiences) if (expOn[e.id]) list.push(e.hasDuties ? `Rewriting your activities at ${e.company || 'this role'}` : `Checking what fits this job at ${e.company || 'this role'}`)
    list.push('Ordering skills by relevance')
    list.push('Checking every line against your Career Profile')
    list.push('Scoring your optimized resume (after)')
    return Array.from(new Set(list))
  }, [draft, hasJobDescription, summaryOn, experiences, expOn])

  // Moderate and High add points: the first time, the user agrees once.
  const checkReady = checkState === 'done' && check !== null
  const needsAgreement = levelSelected && level !== 'easy' && !consented
  const onSubmit = useCallback(async () => {
    if (!draft || !profileId || !checkReady || !levelSelected || skillsPending || submitting || nothingSelected || (needsAgreement && !agreed)) return
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
          ...(needsAgreement && agreed ? { acceptTerms: true } : {}),
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
  }, [draft, profileId, checkReady, levelSelected, skillsPending, submitting, nothingSelected, hasJobDescription, summaryOn, selectedIds, level, router, buildSteps, needsAgreement, agreed])

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
            Saving your job details
            <span className="block text-gold">{draft.target_job_title}</span>
          </h1>
          <ProcessingSteps
            tone="dark"
            steps={['Saving your job details', 'Starting the optimization']}
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
      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 py-6 sm:px-8 lg:py-10">
        <FlowHeader
          step={2}
          onBack={() => router.push('/optimize/target')}
          backLabel="Back to Job Details"
          title={`Choose your ${NAMES.level.toLowerCase()}`}
          subtitle="Choose the amount of rewriting. Your career facts stay the same."
        />

        {loadError ? <Alert variant="danger">{loadError}</Alert> : null}

        {/* 1. What we are optimizing for */}
        <Card tone="light" className="flex flex-col gap-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="type-helper font-semibold uppercase tracking-[0.12em] text-ink-muted">{NAMES.targetJob}</p>
              <p className="mt-0.5 break-words font-display type-section leading-tight text-ink">{draft.target_job_title}</p>
              <p className="mt-1 type-helper text-ink-soft">
                {hasJobDescription
                  ? `${NAMES.jobDescription} added`
                  : `No ${NAMES.jobDescription.toLowerCase()} — the ATS score will be an estimate`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/optimize/target')}
              className="min-h-11 shrink-0 px-2 type-helper font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
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
                className="min-h-11 self-start type-helper font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                {showDescription ? 'Hide job description' : 'Show job description'}
              </button>
              {showDescription ? (
                <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-ctl border border-line bg-canvas p-3 type-helper leading-relaxed text-ink-soft">
                  {draft.job_description}
                </div>
              ) : null}
            </>
          ) : null}
        </Card>

        {/* 1b. Job check — field match, honest scores, certificates to ask about */}
        <JobCheckCard state={checkState} check={check} title={draft.target_job_title} onPasteAdvert={() => router.push('/optimize/target')} onCertificateAdded={() => setCheckRun((n) => n + 1)} />

        {checkState === 'error' ? (
          <Alert variant="danger">
            <p>ATS compatibility checking could not finish. Retry the check before choosing your optimization level.</p>
            <Button variant="secondary" className="mt-3" onClick={() => { setCheckState('loading'); setCheckRun((n) => n + 1) }}>
              Retry ATS check
            </Button>
          </Alert>
        ) : null}

        {/* 2. The level */}
        <Card tone="light" className="p-5">
          <fieldset disabled={!checkReady || submitting} aria-describedby="optimization-status" className="flex min-w-0 flex-col gap-3 disabled:opacity-60">
            <legend className="mb-3 type-caption font-semibold uppercase tracking-[0.12em] text-ink-muted">{NAMES.level}</legend>
            {/* Full cards, stacked on a phone: three 100px buttons could only say
                "Easy · Aims for 60–75", and what each level DOES sat in a box
                below that changed as you tapped. Now every level says what it
                changes before it is chosen. */}
            <div role="radiogroup" aria-label={NAMES.level} className="grid gap-2.5 sm:grid-cols-3">
              {LEVELS.map((l) => {
                const selected = levelSelected && level === l.value
                return (
                  <button
                    key={l.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => { setLevel(l.value); setLevelSelected(true) }}
                    className={cn(
                      'flex flex-col gap-2 rounded-card border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
                      selected ? 'border-teal bg-teal-soft/60' : 'border-line bg-white hover:border-teal/40',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-5 items-center justify-center rounded-full border-2',
                            selected ? 'border-teal' : 'border-line-strong',
                          )}
                        >
                          {selected ? <span className="size-2.5 rounded-full bg-teal" /> : null}
                        </span>
                        <span className="text-[16px] font-semibold text-ink">{l.label}</span>
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 type-caption font-semibold text-ink-soft">{l.tag}</span>
                    </span>
                    <span className="type-helper font-semibold text-teal">
                      {check ? `Estimated ATS match ${check.expected[l.value]}` : checkState === 'loading' ? 'Working out your score…' : l.aim}
                    </span>
                    {l.value === 'high' && check?.highIfConfirmed && check.highIfConfirmed > check.expected.high ? (
                      <span className="-mt-1 type-caption font-semibold text-gold-ink">
                        estimated {check.highIfConfirmed} if you confirm the required skills
                      </span>
                    ) : null}
                    <ul className="flex flex-col gap-1.5">
                      {l.changes.map((c) => (
                        <li key={c} className="flex gap-1.5 type-helper leading-snug text-ink-soft">
                          <span aria-hidden="true" className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-muted" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </button>
                )
              })}
            </div>
            {levelSelected ? <Alert variant={level === 'easy' ? 'info' : 'warning'}>{levelInfo.explain}</Alert> : null}

            {/* HIGH's tick-list (founder, 2026-10-02): the job's tools, standards and
                skills the profile does not show — the user ticks what is true, it
                goes on the Career Profile, and High can then use it. */}
            {levelSelected && level === 'high' && check?.askSkills?.length ? (
              <HighSkillsChecklist items={check.askSkills} upTo={check.highIfConfirmed ?? check.expected.high} onPendingChange={setSkillsPending} onAdded={() => setCheckRun((n) => n + 1)} />
            ) : null}

            {/* Parts to rewrite — all by default, adjustable. */}
            <details className="group rounded-ctl border border-line bg-canvas px-3 py-2">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 type-helper font-semibold text-ink">
                <span>Choose which parts to rewrite</span>
                <span className="type-caption font-normal text-ink-muted">
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
                <p className="type-helper text-ink-muted">Skills are put in order of relevance, never reworded.</p>
              </div>
            </details>
          </fieldset>
        </Card>

        {/* 3. What you get */}
        <div className="rounded-card border border-teal/30 bg-teal-soft/50 px-4 py-3 type-helper leading-relaxed text-ink-soft">
          <strong className="text-ink">You will see:</strong> your {NAMES.atsScore} before and after for this job,
          and your {NAMES.optimizedCv.toLowerCase()}, saved in your {NAMES.library}.
        </div>

        {/* First time only: how it works, and the one-time agreement (migration 061). */}
        {needsAgreement ? (
          <Card tone="light" className="flex flex-col gap-3 border-gold/50 p-5">
            <p className="type-label font-semibold text-ink">{firstTime ? 'Your first optimization — how it works' : 'Before you optimize'}</p>
            <ul className="flex flex-col gap-1.5 type-helper leading-snug text-ink-soft">
              <li>• <strong className="text-ink">Easy</strong> rewords only what your profile says.</li>
              <li>• <strong className="text-ink">Moderate</strong> and <strong className="text-ink">High</strong> offer separate suggestions for duties you may have performed. Select only what is true.</li>
              <li>• Your certificates, education, employers, job titles, dates and personal details are never added or changed.</li>
              <li>• Every application shows unverified suggestions separately in yellow. None is selected or added to your resume until you confirm it.</li>
            </ul>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-ctl border border-line bg-canvas p-3 type-helper text-ink">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-teal" />
              <span>I understand, and I will only send resumes that are true about me — I can talk about every line in an interview.</span>
            </label>
          </Card>
        ) : null}

        {error ? <Alert variant="danger">{error}</Alert> : null}
        {nothingSelected ? (
          <p className="text-center type-helper text-ink-muted">Select the summary or at least one role to rewrite.</p>
        ) : null}

        <p id="optimization-status" role="status" className="text-center type-helper text-ink-soft">
          {!checkReady
            ? checkState === 'error' ? 'Retry ATS checking to continue.' : 'Checking ATS compatibility — optimization unlocks when your results are ready.'
            : !levelSelected ? 'Review your ATS results, then choose Easy, Moderate or High and confirm any relevant suggestions.'
            : skillsPending ? 'Save your selected skills before optimizing your resume.'
            : 'Review your selected level and suggestions, then optimize your resume when you are ready.'}
        </p>
        <Button
          variant="purchase"
          className="w-full"
          disabled={!checkReady || !levelSelected || skillsPending || submitting || !profileId || nothingSelected || (needsAgreement && !agreed)}
          onClick={onSubmit}
        >
          {CTA.optimizeCv}
        </Button>
      </div>
    </main>
  )
}

/**
 * The job check (optimizer v3). Field match first — a different field is said
 * plainly, with the honest low score — then certificates the job asks for that
 * the profile does not show: never added for the user, offered to add to the
 * Career Profile if they really hold them.
 */
function JobCheckCard({ state, check, title, onPasteAdvert, onCertificateAdded }: { state: 'idle' | 'loading' | 'done' | 'error'; check: JobCheck | null; title: string; onPasteAdvert: () => void; onCertificateAdded: () => void }) {
  const [added, setAdded] = useState<string[]>([])
  const [showAdvert, setShowAdvert] = useState(false)
  if (state === 'idle' || state === 'error') return null
  if (state === 'loading' || !check) {
    return (
      <Card tone="light" className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-center gap-4"><ProcessingOrbit size={64} /><div className="min-w-0"><h2 className="type-label font-semibold text-ink">Checking your job match</h2><p role="status" className="mt-1 type-helper text-ink-soft">Comparing the role with your Career Profile. Your level options unlock when results arrive.</p></div></div>
        <p className="type-helper leading-relaxed text-ink-soft">This check reviews role fit, requirements and preparation options. Keep this page open.</p>
      </Card>
    )
  }
  const tone =
    check.fieldMatch === 'same'
      ? { box: 'border-teal/40 bg-teal-soft/50', title: 'text-teal', label: 'Strong match — this job is in your field' }
      : check.fieldMatch === 'related'
        ? { box: 'border-gold-line bg-gold-bg', title: 'text-gold-text', label: 'Partly your field' }
        : { box: 'border-alert/30 bg-alert-soft', title: 'text-alert', label: 'Outside your field' }
  return (
    <Card tone="light" className={cn('flex flex-col gap-2.5 border-2 p-5', tone.box)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={cn('type-label font-semibold', tone.title)}>{tone.label}</p>
        <p className="type-helper text-ink-muted">
          Your resume today: <strong className="font-mono text-ink">{check.before}</strong>
        </p>
      </div>
      <p className="type-helper leading-relaxed text-ink-soft">
        {check.fieldMatch === 'same'
          ? `Your experience (${check.candidateField}) matches this ${check.jobField} role.`
          : check.fieldMatch === 'related'
            ? `Your experience (${check.candidateField}) shares part of the work of this ${check.jobField} role. Requirements outside your field stay unmet, so the score has a ceiling.`
            : `This job is ${check.jobField}; your experience is ${check.candidateField}. Even after optimization your resume will score low for it (up to ${check.expected.high}) — jobs in your own field will score much higher. You can still go ahead.`}
      </p>
      {/* No advert (2026-10-02): matched against the typical Gulf advert for the
          title — shown, so the user sees exactly what the score is based on. */}
      {check.typical ? (
        <div className="flex flex-col gap-2 rounded-ctl border border-gold/40 bg-gold-soft/60 p-3">
          <p className="type-helper font-semibold text-ink">No job advert pasted — matched against typical {title} requirements in the Gulf</p>
          <p className="type-helper leading-snug text-ink-soft">
            Your resume is written for what most Gulf adverts for this title ask. A real advert uses its own words, and the ATS
            looks for those exact words — so if you have the advert (even a WhatsApp message), paste it for a much stronger match.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onPasteAdvert} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
              Paste the real advert
            </button>
            {check.typicalAdvert ? (
              <button type="button" onClick={() => setShowAdvert((v) => !v)} className="min-h-9 type-helper font-semibold text-teal underline-offset-2 hover:underline">
                {showAdvert ? 'Hide typical requirements' : 'See the typical requirements'}
              </button>
            ) : null}
          </div>
          {showAdvert && check.typicalAdvert ? (
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-ctl border border-line bg-white p-3 font-sans type-helper leading-relaxed text-ink-soft">{check.typicalAdvert}</pre>
          ) : null}
        </div>
      ) : null}
      {check.askCertifications.length || added.length ? (
        <div className="flex flex-col gap-2 rounded-ctl border border-line bg-white p-3">
          {check.askCertifications.length ? (
            <>
              <p className="type-helper font-semibold text-ink">This job asks for certificates your profile does not show</p>
              <p className="type-helper leading-snug text-ink-muted">
                We never add certificates for you. If you really hold one, tell us here — it goes on your Career Profile and raises your score.
              </p>
              <ul className="flex flex-col divide-y divide-line">
                {check.askCertifications.map((c) => (
                  <CertAsk
                    key={c.term}
                    cert={c}
                    onAdded={(name) => {
                      setAdded((a) => [...a, name])
                      onCertificateAdded()
                    }}
                  />
                ))}
              </ul>
            </>
          ) : null}
          {added.length ? (
            <p className="flex items-start gap-1.5 type-helper font-semibold text-ok">
              <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
              Added to your Career Profile: {added.join(', ')}. Your scores above include it, and your resume will list it.
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
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
          'flex size-5 shrink-0 items-center justify-center rounded-[6px] type-caption text-white',
          on ? 'bg-teal' : 'border-[1.5px] border-line-strong',
        )}
      >
        {on ? '✓' : ''}
      </span>
      <span className="type-helper font-semibold text-ink">{label}</span>
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

/**
 * One certificate the job asks for: "Yes, I have it" opens three fields and
 * saves it to the Career Profile (POST /api/profile/certifications). The name
 * starts as the job's own wording, because the ATS looks for those words.
 * The user states it — nothing is added without this click.
 */
function CertAsk({ cert, onAdded }: { cert: { term: string; importance: 'must' | 'nice'; gain: number }; onAdded: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(cert.term)
  const [issuer, setIssuer] = useState('')
  const [year, setYear] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const field = 'min-h-11 w-full rounded-ctl border border-line-strong bg-white px-3 type-label text-ink focus:border-teal focus:outline-none'

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, issuer, year: year.trim() || null }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok && body?.code !== 'DUPLICATE') {
        setError((body?.error as string) ?? 'Could not save it. Please try again.')
        return
      }
      onAdded(name.trim())
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="flex flex-col gap-2 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 type-helper">
        <span className="text-ink">
          {cert.term}
          {cert.importance === 'must' ? <span className="ml-1.5 type-caption font-semibold text-alert">required</span> : null}
        </span>
        <span className="flex items-center gap-3">
          {cert.gain > 0 ? <span className="font-mono type-caption font-semibold text-teal">+{cert.gain} point{cert.gain === 1 ? '' : 's'}</span> : null}
          {!open ? (
            <button type="button" onClick={() => setOpen(true)} className="min-h-9 rounded-ctl border border-teal/40 px-3 type-helper font-semibold text-teal hover:bg-teal-soft">
              Yes, I have it
            </button>
          ) : null}
        </span>
      </div>
      {open ? (
        <div className="flex flex-col gap-2 rounded-ctl bg-canvas p-3">
          <label className="flex flex-col gap-1 type-caption font-semibold text-ink-soft">
            Certificate name — keep the job’s words so the ATS finds it
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={200} />
          </label>
          <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
            <label className="flex flex-col gap-1 type-caption font-semibold text-ink-soft">
              Issued by (optional)
              <input value={issuer} onChange={(e) => setIssuer(e.target.value)} className={field} maxLength={200} placeholder="e.g. PMI, USGBC, RTA" />
            </label>
            <label className="flex flex-col gap-1 type-caption font-semibold text-ink-soft">
              Year (optional)
              <input value={year} onChange={(e) => setYear(e.target.value.replace(/D/g, '').slice(0, 4))} className={field} inputMode="numeric" placeholder="2021" />
            </label>
          </div>
          {error ? <p className="type-helper text-alert">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void save()} disabled={saving || name.trim().length < 2} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
              {saving ? 'Saving…' : 'I hold this — add it to my profile'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="min-h-9 px-2 type-helper font-semibold text-ink-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

/**
 * High's tick-list: "This job also asks for these — tick the ones you really
 * have." Ticked items are saved to the Career Profile's Skills
 * (POST /api/profile/skills) and the job check runs again (no model call), so
 * the scores update at once. Nothing is added without a tick.
 */
function HighSkillsChecklist({ items, upTo, onAdded, onPendingChange }: { items: Array<{ term: string; importance: 'must' | 'nice'; gain: number }>; upTo: number; onAdded: () => void; onPendingChange: (pending: boolean) => void }) {
  const [ticked, setTicked] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [added, setAdded] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const open = items.filter((i) => !added.includes(i.term))

  useEffect(() => {
    onPendingChange(saving || ticked.length > 0)
    return () => onPendingChange(false)
  }, [saving, ticked.length, onPendingChange])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names: ticked }) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((body?.error as string) ?? 'Could not save them. Please try again.')
        return
      }
      setAdded((a) => [...a, ...ticked])
      setTicked([])
      onAdded()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card tone="light" className="flex flex-col gap-3 border-2 border-gold/40 bg-gold-soft/40 p-4">
      <div className="flex flex-col gap-1">
        <p className="type-label font-semibold text-ink">This job also asks for these — tick the ones you really have</p>
        <p className="type-helper leading-snug text-ink-soft">
          They are not on your Career Profile yet, so we cannot write them for you. Tick only what you really use or know — an
          interviewer may ask about any of them. Each one goes on your profile’s Skills and into this resume. High can reach up to {upTo}.
        </p>
      </div>
      {open.length ? (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {open.map((i) => {
            const on = ticked.includes(i.term)
            return (
              <li key={i.term}>
                <label className={cn('flex min-h-11 cursor-pointer items-center gap-2.5 rounded-ctl border bg-white px-3 py-2 type-helper', on ? 'border-teal' : 'border-line')}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setTicked((t) => (on ? t.filter((x) => x !== i.term) : [...t, i.term]))}
                    className="size-4 shrink-0 accent-teal"
                  />
                  <span className="min-w-0 flex-1 text-ink">
                    {i.term}
                    {i.importance === 'must' ? <span className="ml-1.5 text-[11.5px] font-semibold text-alert">required</span> : null}
                  </span>
                  {i.gain > 0 ? <span className="font-mono text-[11.5px] font-semibold text-teal">+{i.gain}</span> : null}
                </label>
              </li>
            )
          })}
        </ul>
      ) : null}
      {added.length ? (
        <p className="flex items-start gap-1.5 type-helper font-semibold text-ok">
          <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
          Added to your Career Profile: {added.join(', ')}. The scores above include them.
        </p>
      ) : null}
      {error ? <p className="type-helper text-alert">{error}</p> : null}
      {open.length ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void save()} disabled={saving || !ticked.length} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            {saving ? 'Saving…' : ticked.length ? `I have ${ticked.length === 1 ? 'this' : 'these ' + ticked.length} — add to my profile` : 'Tick what you have'}
          </button>
          <span className="type-caption text-ink-muted">Or skip — High still works with what your profile already shows.</span>
        </div>
      ) : null}
    </Card>
  )
}
