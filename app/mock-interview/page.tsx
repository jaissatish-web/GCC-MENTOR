'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { PreparationJourney } from '@/components/package/PreparationJourney'
import { PageShell } from '@/components/layout/PageShell'
import { NextStep } from '@/components/journey/NextStep'
import { Card } from '@/components/ui/Card'
import { Button, buttonVariants } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProcessingInline } from '@/components/ui/Processing'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { CTA } from '@/lib/serviceLabels'
import { MOCK_ANSWER_MAX_CHARS } from '@/lib/mockInterviewLimits'
import { usePackagePicker } from '@/lib/usePackagePicker'
import type { PackageSummary } from '@/lib/packageSummary'
import type { MockInterviewDifficulty, MockInterviewMode, MockInterviewRun, Package } from '@/types/package'

const MODES: Array<{ value: MockInterviewMode; label: string; body: string }> = [
  { value: 'mixed', label: 'Mixed', body: 'HR, technical, Gulf readiness and manager questions.' },
  { value: 'technical', label: 'Technical', body: 'Tools, standards, troubleshooting and project depth.' },
  { value: 'hr', label: 'HR', body: 'Introduction, motivation, strengths and career movement.' },
  { value: 'gulf_readiness', label: 'Gulf readiness', body: 'Client, site, visa/location and GCC expectation checks.' },
  { value: 'manager', label: 'Manager', body: 'Leadership, pressure, stakeholder and decision questions.' },
]

const DIFFICULTIES: Array<{ value: MockInterviewDifficulty; label: string }> = [
  { value: 'standard', label: 'Standard' },
  { value: 'strong', label: 'Strong' },
  { value: 'challenging', label: 'Challenging' },
]

const COUNT_OPTIONS = [
  { value: 5, label: 'Quick' },
  { value: 10, label: 'Standard' },
  { value: 15, label: 'Deep' },
]

// Honest about what is assessed (audit M10): written answers only.
const NOTES = [
  'This is text practice: your written answers are reviewed. Voice, pace and pronunciation are not assessed.',
  'Short, specific answers usually beat long generic answers.',
  'Use the same facts you would defend in a real Gulf interview.',
]

/**
 * A DRAFT BELONGS TO ONE QUESTION (audit M06, 2026-09-15). The answer box used
 * to be one string for the whole screen, so switching to another job carried a
 * half-written answer into a different interview. Drafts are now keyed by
 * package + run + question, kept in sessionStorage so a refresh or a failed
 * request never loses them, and cleared only once that answer is saved.
 *
 * LIST LIGHT, OPEN ONE (audit M08): the picker lists jobs whose CV is built;
 * only the chosen job's interview runs are loaded (lib/usePackagePicker.ts).
 */
function draftKey(packageId: string, runId: string, questionId: string): string {
  return `gcc.mockDraft.${packageId}.${runId}.${questionId}`
}
function readDraft(key: string): string {
  try {
    return window.sessionStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}
function writeDraft(key: string, value: string): void {
  try {
    if (value) window.sessionStorage.setItem(key, value)
    else window.sessionStorage.removeItem(key)
  } catch {
    /* storage unavailable — the draft still lives in memory */
  }
}

function packageTarget(pkg: Pick<PackageSummary, 'target_job_title' | 'target_company'>): string {
  return [pkg.target_job_title, pkg.target_company].filter(Boolean).join(' · ')
}

function latestRun(pkg: Package | null): MockInterviewRun | null {
  const runs = pkg?.mock_interview_runs ?? []
  return runs.slice().sort((a, b) => b.generated_at.localeCompare(a.generated_at))[0] ?? null
}

function MockInterviewScreen() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const requestedIdRef = useRef(searchParams.get('package'))
  const picker = usePackagePicker({ requestedId: requestedIdRef.current, onlyWithResume: true })
  const { list, total, listError, selectedId, setSelectedId, selectedSummary, detail, detailError, detailLoading } = picker
  const [mode, setMode] = useState<MockInterviewMode>('mixed')
  const [difficulty, setDifficulty] = useState<MockInterviewDifficulty>('standard')
  const [questionCount, setQuestionCount] = useState(10)
  const [opError, setOpError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'start' | 'answer' | 'finish' | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const requestedRunId = searchParams.get('run')
  const run = detail?.mock_interview_runs?.find((item) => item.id === requestedRunId && item.status === 'completed' && item.final_report) ?? latestRun(detail)
  const currentQuestion = run?.status === 'in_progress' ? run.questions.find((q) => !q.answer) ?? null : null
  const answeredCount = run?.questions.filter((q) => q.answer).length ?? 0
  const currentDraftKey = selectedId && run && currentQuestion ? draftKey(selectedId, run.id, currentQuestion.id) : null
  const answerDraft = currentDraftKey ? drafts[currentDraftKey] ?? '' : ''

  // Load a saved draft the first time its question is shown.
  useEffect(() => {
    if (!currentDraftKey || currentDraftKey in drafts) return
    const saved = readDraft(currentDraftKey)
    setDrafts((prev) => ({ ...prev, [currentDraftKey]: saved }))
  }, [currentDraftKey, drafts])

  function setAnswerDraft(value: string) {
    if (!currentDraftKey) return
    setDrafts((prev) => ({ ...prev, [currentDraftKey]: value }))
    writeDraft(currentDraftKey, value)
  }

  /** Apply a run to the package it BELONGS to — not whichever package is open when the reply lands. */
  function applyRun(packageId: string, next: MockInterviewRun) {
    picker.updateDetail(packageId, (p) => {
      const runs = p.mock_interview_runs ?? []
      const exists = runs.some((r) => r.id === next.id)
      return { ...p, mock_interview_runs: exists ? runs.map((r) => (r.id === next.id ? next : r)) : [...runs, next] }
    })
    picker.patchSummary(
      packageId,
      next.status === 'completed' && next.final_report
        ? { mock_completed_run_id: next.id, mock_in_progress: false }
        : { mock_in_progress: next.status === 'in_progress' },
    )
  }

  async function start() {
    if (!selectedId) return
    const packageId = selectedId
    setOpError(null)
    setBusy('start')
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(packageId)}/mock-interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, difficulty, questionCount }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOpError((payload?.error as string | undefined) ?? 'Could not start the mock interview.')
        return
      }
      applyRun(packageId, payload.run as MockInterviewRun)
      router.replace(`/mock-interview?package=${encodeURIComponent(packageId)}`, { scroll: false })
    } catch {
      setOpError('Could not reach the server. Check your connection and try again — nothing was used.')
    } finally {
      setBusy(null)
    }
  }

  async function submitAnswer() {
    if (!selectedId || !run || !currentQuestion || !currentDraftKey) return
    const packageId = selectedId
    const key = currentDraftKey
    setOpError(null)
    setBusy('answer')
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(packageId)}/mock-interview/${encodeURIComponent(run.id)}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: currentQuestion.id, answer: answerDraft }),
      })
      const payload = await res.json().catch(() => ({}))
      if (res.status === 409 && payload?.run) {
        // Already answered (another tab, or a retry after a lost reply): show
        // what is saved. The draft is kept in case the user wants it.
        applyRun(packageId, payload.run as MockInterviewRun)
        setOpError((payload?.error as string | undefined) ?? 'This question already has a saved answer.')
        return
      }
      if (!res.ok) {
        setOpError((payload?.error as string | undefined) ?? 'Could not review this answer. Your answer is still in the box.')
        return
      }
      applyRun(packageId, payload.run as MockInterviewRun)
      writeDraft(key, '')
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } catch {
      setOpError('Could not reach the server. Your answer is still in the box — try again when you are back online.')
    } finally {
      setBusy(null)
    }
  }

  async function finish() {
    if (!selectedId || !run) return
    const packageId = selectedId
    setOpError(null)
    setBusy('finish')
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(packageId)}/mock-interview/${encodeURIComponent(run.id)}/finish`, { method: 'POST' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOpError((payload?.error as string | undefined) ?? 'Could not create the report. Your answers are saved.')
        return
      }
      applyRun(packageId, payload.run as MockInterviewRun)
    } catch {
      setOpError('Could not reach the server. Your answers are saved — try again when you are back online.')
    } finally {
      setBusy(null)
    }
  }

  if (listError) {
    return (
      <main className="mx-auto flex w-full max-w-[980px] flex-col items-start gap-3 px-3 sm:px-5 py-8 font-redesign-sans">
        <p role="alert" className="text-[14px] text-alert">{listError}</p>
        <Button type="button" variant="secondary" onClick={picker.reloadList}>
          Try again
        </Button>
      </main>
    )
  }
  if (list === null) {
    return (
      <main className="mx-auto w-full max-w-[980px] px-3 sm:px-5 py-8 font-redesign-sans">
        <SkeletonGroup label="Loading mock interview">
          <Skeleton shape="title" />
          <Skeleton />
          <Skeleton className="w-3/4" />
        </SkeletonGroup>
      </main>
    )
  }

  const unanswered = run ? run.questions.length - answeredCount : 0

  return (
    <PageShell
      icon={ChatBubbleLeftRightIcon}
      eyebrow="Step 7 · Practise"
      title="Mock Interview"
      subtitle="A written practice interview for one target job, one question at a time, with a saved feedback report."
      uses={['Optimized CV', 'Target job', 'Career Profile']}
    >
      {selectedSummary ? <PreparationJourney pkg={detail ?? selectedSummary} current={run?.status === 'completed' ? 'report' : 'mock'} /> : null}
      <Card tone="light" className="mt-5 p-5 sm:p-6">
        {total === 0 ? (
          <EmptyState
            tone="inline"
            icon={ChatBubbleLeftRightIcon}
            className="border-0 bg-transparent"
            title="Add a target job first"
            body="Mock interviews are attached to one optimized resume package."
            action={<Link href="/optimize/target" className={buttonVariants({ variant: 'primary' })}>{CTA.addTargetJob}</Link>}
          />
        ) : list.length === 0 ? (
          <EmptyState
            tone="inline"
            icon={ChatBubbleLeftRightIcon}
            className="border-0 bg-transparent"
            title="Build an optimized resume first"
            body="The mock interview uses the final CV and job description, so create that package first."
            action={<Link href="/optimize/target" className={buttonVariants({ variant: 'primary' })}>{CTA.optimizeCv}</Link>}
          />
        ) : (
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Interview package</span>
              {/* Locked while a request is running, so a reply can never land on a different job. */}
              <select
                value={selectedId ?? ''}
                onChange={(e) => {
                  setOpError(null)
                  setSelectedId(e.target.value)
                }}
                disabled={busy !== null}
                className="field"
              >
                {list.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white text-ink">
                    {packageTarget(p)}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 lg:grid-cols-5">
              {MODES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  aria-pressed={mode === opt.value}
                  className={cn(
                    'rounded-ctl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
                    mode === opt.value ? 'border-2 border-teal bg-teal-soft' : 'border-line bg-white hover:border-teal/50',
                  )}
                >
                  <span className="block text-[13px] font-bold text-ink">{opt.label}</span>
                  <span className="mt-1 block text-[12px] leading-snug text-ink-muted">{opt.body}</span>
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="field-label">Difficulty</span>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as MockInterviewDifficulty)} className="field">
                  {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="field-label">Length</span>
                <select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="field">
                  {COUNT_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label} · {c.value} questions</option>)}
                </select>
              </label>
            </div>

            {opError ? <p role="alert" className="rounded-ctl border border-alert/40 bg-alert-soft px-3.5 py-3 text-[13px] text-alert">{opError}</p> : null}
            {detailError ? (
              <div className="flex flex-col items-start gap-2">
                <p role="alert" className="rounded-ctl border border-alert/40 bg-alert-soft px-3.5 py-3 text-[13px] text-alert">{detailError}</p>
                <Button type="button" variant="secondary" onClick={picker.reloadDetail}>Try again</Button>
              </div>
            ) : null}
            {busy ? (
              <ProcessingInline
                steps={busy === 'start' ? ['Reading the optimized resume', 'Building the interview plan', 'Preparing realistic questions'] : busy === 'answer' ? ['Reviewing your answer', 'Checking structure and evidence', 'Preparing feedback'] : ['Reading your answers', 'Reviewing each answer', 'Writing your preparation report']}
                stepMs={4500}
                notes={NOTES}
              />
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12.5px] text-ink-muted">
                {detailLoading && !detail
                  ? 'Loading this job…'
                  : run
                    ? `Latest run: ${run.status === 'completed' ? 'completed' : 'in progress'} · ${answeredCount}/${run.question_count} answered`
                    : 'No mock interview yet for this package.'}
              </p>
              <Button type="button" variant="primary" onClick={() => void start()} disabled={!selectedId || busy !== null || !detail} busy={busy === 'start'} busyLabel="Starting…">
                {CTA.startMockInterview}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {run ? (
        <section id="interview-report" className="mt-6 scroll-mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
          <Card tone="light" className="p-5 sm:p-6">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-[21px] font-semibold text-ink">
                {run.status === 'completed' ? 'Preparation report' : currentQuestion ? `Question ${answeredCount + 1}` : 'Ready to finish'}
              </h2>
              <p className="text-[12.5px] text-ink-muted">{run.opening_note}</p>
            </div>

            {run.status === 'completed' && run.final_report ? (
              <Report run={run} />
            ) : currentQuestion ? (
              <div className="mt-5 flex flex-col gap-4">
                <div className="rounded-ctl bg-canvas p-4">
                  <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal">{currentQuestion.focus}</span>
                  <p className="mt-2 font-display text-[19px] font-semibold leading-snug text-ink">{currentQuestion.question}</p>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="sr-only">Your answer</span>
                  <textarea
                    value={answerDraft}
                    onChange={(e) => setAnswerDraft(e.target.value)}
                    rows={7}
                    maxLength={MOCK_ANSWER_MAX_CHARS}
                    className="field p-4"
                    placeholder="Type your answer as you would say it in the interview..."
                    aria-describedby="answer-count"
                  />
                  <span id="answer-count" className="self-end text-[12px] text-ink-muted">
                    {answerDraft.length.toLocaleString('en-US')} / {MOCK_ANSWER_MAX_CHARS.toLocaleString('en-US')} characters
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="primary" onClick={() => void submitAnswer()} disabled={!answerDraft.trim() || busy !== null} busy={busy === 'answer'} busyLabel="Reviewing…">
                    Submit answer
                  </Button>
                  {answeredCount > 0 ? (
                    <Button type="button" variant="secondary" onClick={() => void finish()} disabled={busy !== null} busy={busy === 'finish'} busyLabel="Finishing…">
                      Finish now and get report
                    </Button>
                  ) : null}
                </div>
                {answeredCount > 0 && unanswered > 0 ? (
                  <p className="text-[12px] leading-relaxed text-ink-muted">
                    Finishing now reviews your {answeredCount} answered {answeredCount === 1 ? 'question' : 'questions'} only; the other {unanswered} are skipped. A finished report is final — start a new interview to practise again.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-3 rounded-ctl bg-canvas p-4">
                <p className="text-[14px] text-ink-soft">All questions are answered. Generate your preparation report.</p>
                <Button type="button" variant="primary" onClick={() => void finish()} disabled={busy !== null} busy={busy === 'finish'} busyLabel="Finishing…">
                  Finish and get report
                </Button>
              </div>
            )}
          </Card>

          <aside className="flex flex-col gap-3">
            {run.questions.map((q, index) => (
              <Card key={q.id} tone="light" className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-[12px] font-bold text-teal">Q{index + 1}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold uppercase', q.answer ? 'bg-teal-soft text-teal' : 'bg-canvas text-ink-muted')}>
                    {q.answer ? 'Answered' : run.status === 'completed' ? 'Skipped' : 'Open'}
                  </span>
                </div>
                <p className="mt-2 break-words text-[13px] font-semibold leading-snug text-ink">{q.question}</p>
                {q.feedback ? <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{q.feedback}</p> : null}
              </Card>
            ))}
          </aside>
        </section>
      ) : null}

      {selectedId && run?.status === 'completed' ? (
        <NextStep
          className="mt-6"
          title="Apply, then keep track"
          body="Your CV, letter and preparation for this job are ready. When you apply, set its stage in your Resume Library so you always know where each application stands."
          href="/dashboard/library"
          cta="Open my Resume Library"
          secondary={{ href: `/package/${encodeURIComponent(selectedId)}`, label: CTA.viewOptimizedCv }}
        />
      ) : null}

      <p className="mt-6 text-center text-[12px] text-ink-muted">
        Text mock interview only. Voice recording and speaking feedback are not included.
      </p>
    </PageShell>
  )
}

function Report({ run }: { run: MockInterviewRun }) {
  const report = run.final_report
  if (!report) return null
  const scores = [
    ['Overall', report.overall_score],
    ['Technical', report.technical_score],
    ['Role fit', report.role_fit_score],
    ['Gulf readiness', report.gulf_readiness_score],
    ['Answer structure', report.answer_structure_score],
  ] as const
  return (
    <div className="mt-5 flex flex-col gap-5">
      <p className="rounded-ctl border border-line bg-canvas px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-muted">
        AI preparation feedback on your written answers. It is guidance for practice — not a prediction of any employer&apos;s decision.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {scores.map(([label, value]) => (
          <div key={label} className="rounded-ctl bg-canvas p-3">
            <span className="text-[12px] text-ink-muted">{label}</span>
            <strong className="mt-1 block font-display text-[25px] text-teal">{value}</strong>
          </div>
        ))}
      </div>
      {[
        ['Strengths', report.strengths],
        ['Weak points', report.weak_points],
        ['Risky answers', report.risky_answers],
        ['Improvement plan', report.improvement_plan],
        ['Practice next', report.next_practice_questions],
      ].map(([title, items]) => (
        <div key={title as string}>
          <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">{title as string}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {(items as string[]).map((item) => (
              <li key={item} className="rounded-ctl border border-line bg-white px-3 py-2 text-[13px] leading-relaxed text-ink-soft">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function MockInterviewPage() {
  return (
    <Suspense>
      <MockInterviewScreen />
    </Suspense>
  )
}
