'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { PreparationJourney } from '@/components/package/PreparationJourney'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Button, buttonVariants } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProcessingInline } from '@/components/ui/Processing'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
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

const NOTES = [
  'This is text practice. Voice, pace and pronunciation scoring will come later.',
  'Short, specific answers usually beat long generic answers.',
  'Use the same facts you would defend in a real Gulf interview.',
]

function packageTarget(pkg: Package): string {
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
  const [packages, setPackages] = useState<Package[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<MockInterviewMode>('mixed')
  const [difficulty, setDifficulty] = useState<MockInterviewDifficulty>('standard')
  const [questionCount, setQuestionCount] = useState(10)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [opError, setOpError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'start' | 'answer' | 'finish' | null>(null)
  const [answerDraft, setAnswerDraft] = useState('')
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    fetch('/api/packages', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('Unable to load packages'); return r.json() })
      .then((data) => {
        const list = (data?.packages as Package[] | undefined) ?? []
        const optimized = list.filter((p) => p.optimized_content != null)
        setPackages(list)
        setSelectedId(optimized.find((p) => p.id === requestedIdRef.current)?.id ?? optimized[0]?.id ?? null)
      })
      .catch(() => setLoadError('Could not load your resume packages. Please try again.'))
  }, [])

  const optimizedPackages = useMemo(() => (packages ?? []).filter((p) => p.optimized_content != null), [packages])
  const selected = useMemo(() => optimizedPackages.find((p) => p.id === selectedId) ?? null, [optimizedPackages, selectedId])
  const requestedRunId = searchParams.get('run')
  const run = selected?.mock_interview_runs?.find((item) => item.id === requestedRunId && item.status === 'completed' && item.final_report) ?? latestRun(selected)
  const currentQuestion = run?.status === 'in_progress' ? run.questions.find((q) => !q.answer) ?? null : null
  const answeredCount = run?.questions.filter((q) => q.answer).length ?? 0

  function updateSelectedRun(next: MockInterviewRun) {
    setPackages((prev) =>
      prev
        ? prev.map((p) => {
            if (p.id !== selected?.id) return p
            const runs = p.mock_interview_runs ?? []
            const exists = runs.some((r) => r.id === next.id)
            return { ...p, mock_interview_runs: exists ? runs.map((r) => (r.id === next.id ? next : r)) : [...runs, next] }
          })
        : prev,
    )
  }

  async function start() {
    if (!selected) return
    setOpError(null)
    setBusy('start')
    setAnswerDraft('')
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(selected.id)}/mock-interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, difficulty, questionCount }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOpError((payload?.error as string | undefined) ?? 'Could not start the mock interview.')
        return
      }
      updateSelectedRun(payload.run as MockInterviewRun)
      router.replace(`/mock-interview?package=${encodeURIComponent(selected.id)}`, { scroll: false })
    } catch {
      setOpError('Could not start the mock interview.')
    } finally {
      setBusy(null)
    }
  }

  async function submitAnswer() {
    if (!selected || !run || !currentQuestion) return
    setOpError(null)
    setBusy('answer')
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(selected.id)}/mock-interview/${encodeURIComponent(run.id)}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: currentQuestion.id, answer: answerDraft }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOpError((payload?.error as string | undefined) ?? 'Could not review this answer.')
        return
      }
      updateSelectedRun(payload.run as MockInterviewRun)
      setAnswerDraft('')
    } catch {
      setOpError('Could not review this answer.')
    } finally {
      setBusy(null)
    }
  }

  async function finish() {
    if (!selected || !run) return
    setOpError(null)
    setBusy('finish')
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(selected.id)}/mock-interview/${encodeURIComponent(run.id)}/finish`, { method: 'POST' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOpError((payload?.error as string | undefined) ?? 'Could not create the final report.')
        return
      }
      updateSelectedRun(payload.run as MockInterviewRun)
    } catch {
      setOpError('Could not create the final report.')
    } finally {
      setBusy(null)
    }
  }

  if (loadError) {
    return <main className="mx-auto w-full max-w-[980px] px-5 py-8 font-redesign-sans text-alert">{loadError}</main>
  }
  if (packages === null) {
    return (
      <main className="mx-auto w-full max-w-[980px] px-5 py-8 font-redesign-sans">
        <SkeletonGroup label="Loading mock interview">
          <Skeleton shape="title" />
          <Skeleton />
          <Skeleton className="w-3/4" />
        </SkeletonGroup>
      </main>
    )
  }

  return (
    <PageShell
      title="Mock Interview"
      subtitle="Practice one role-specific interview from your optimized resume and receive a saved report."
    >
      {selected ? <PreparationJourney pkg={selected} current={run?.status === 'completed' ? 'report' : 'mock'} /> : null}
      <Card tone="light" className="mt-5 p-5 sm:p-6">
        {packages.length === 0 ? (
          <EmptyState
            tone="inline"
            icon={ChatBubbleLeftRightIcon}
            className="border-0 bg-transparent"
            title="Add a target job first"
            body="Mock interviews are attached to one optimized resume package."
            action={<Link href="/optimize/target" className={buttonVariants({ variant: 'primary' })}>Add a target job</Link>}
          />
        ) : optimizedPackages.length === 0 ? (
          <EmptyState
            tone="inline"
            icon={ChatBubbleLeftRightIcon}
            className="border-0 bg-transparent"
            title="Build an optimized resume first"
            body="The mock interview uses the final CV and job description, so create that package first."
            action={<Link href="/optimize/target" className={buttonVariants({ variant: 'primary' })}>Build optimized resume</Link>}
          />
        ) : (
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Interview package</span>
              <select value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value)} className="field">
                {optimizedPackages.map((p) => (
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
            {busy ? (
              <ProcessingInline
                steps={busy === 'start' ? ['Reading the optimized resume', 'Building the interview plan', 'Preparing realistic questions'] : busy === 'answer' ? ['Reviewing your answer', 'Checking structure and evidence', 'Preparing feedback'] : ['Reading the full interview', 'Scoring your readiness', 'Writing the final report']}
                stepMs={4500}
                notes={NOTES}
              />
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12.5px] text-ink-muted">
                {run ? `Latest run: ${run.status === 'completed' ? 'completed' : 'in progress'} · ${answeredCount}/${run.question_count} answered` : 'No mock interview yet for this package.'}
              </p>
              <Button type="button" variant="primary" onClick={() => void start()} disabled={!selected || busy !== null} busy={busy === 'start'} busyLabel="Starting…">
                Start new interview
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
                {run.status === 'completed' ? 'Final report' : currentQuestion ? `Question ${answeredCount + 1}` : 'Ready to finish'}
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
                <textarea
                  value={answerDraft}
                  onChange={(e) => setAnswerDraft(e.target.value)}
                  rows={7}
                  className="field p-4"
                  placeholder="Type your answer as you would say it in the interview..."
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="primary" onClick={() => void submitAnswer()} disabled={!answerDraft.trim() || busy !== null} busy={busy === 'answer'} busyLabel="Reviewing…">
                    Submit answer
                  </Button>
                  {answeredCount > 0 ? (
                    <Button type="button" variant="secondary" onClick={() => void finish()} disabled={busy !== null} busy={busy === 'finish'} busyLabel="Finishing…">
                      Finish and get report
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-3 rounded-ctl bg-canvas p-4">
                <p className="text-[14px] text-ink-soft">All questions are answered. Generate the final readiness report.</p>
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
                    {q.answer ? 'Answered' : 'Open'}
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-semibold leading-snug text-ink">{q.question}</p>
                {q.feedback ? <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{q.feedback}</p> : null}
              </Card>
            ))}
          </aside>
        </section>
      ) : null}

      <p className="mt-6 text-center text-[12px] text-ink-muted">
        Text mock interview only. Voice recording and speaking feedback are not included yet.
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
      <div className="grid gap-3 sm:grid-cols-5">
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
