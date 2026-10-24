'use client'

import { CallOrb, JOINING_LINES } from '@/components/mock-interview/CallOrb'
import { CAREER_RESUME_BADGE, isCareerProfileResume } from '@/lib/careerProfileResume'
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
import { ArrowLeft, ChevronRight, Mic, MessageSquare, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CTA } from '@/lib/serviceLabels'
import { MOCK_ANSWER_MAX_CHARS } from '@/lib/mockInterviewLimits'
import { usePackagePicker } from '@/lib/usePackagePicker'
import type { PackageSummary } from '@/lib/packageSummary'
import type { MockInterviewDifficulty, MockInterviewMode, MockInterviewRun, Package } from '@/types/package'
import { stageEyebrow } from '@/components/journey/stages'
import { StageGate } from '@/components/journey/StageGate'
import { VoiceInterview } from '@/components/mock-interview/VoiceInterview'
import { InterviewProgress } from '@/components/mock-interview/InterviewProgress'
import { interviewProgress, orderedAttempts } from '@/lib/interviewProgress'
import { InterviewReport } from '@/components/mock-interview/InterviewReport'
import { InterviewerPicker } from '@/components/mock-interview/InterviewerPicker'
import type { InterviewerId } from '@/lib/voice/interviewers'

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
  'Recorded answers are saved first. Review begins only when you request it.',
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

function packageTarget(pkg: Pick<PackageSummary, 'tier' | 'name' | 'target_job_title' | 'target_company'>): string {
  if (isCareerProfileResume(pkg)) return `${pkg.name || pkg.target_job_title} · ${CAREER_RESUME_BADGE}`
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
  const isRaw = isCareerProfileResume(selectedSummary ?? {})
  const [voiceReady, setVoiceReady] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    void fetch('/api/mock-interview/voice-capabilities').then(r => r.json()).then(p => { if (!cancelled) setVoiceReady(p.enabled === true) }).catch(() => { if (!cancelled) setVoiceReady(false) })
    return () => { cancelled = true }
  }, [])
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  const [mode, setMode] = useState<MockInterviewMode>('mixed')
  const [difficulty, setDifficulty] = useState<MockInterviewDifficulty>('standard')
  const [questionCount, setQuestionCount] = useState(10)
  const [interviewerId, setInterviewerId] = useState<InterviewerId>('british-woman')
  const [opError, setOpError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'start' | 'answer' | 'finish' | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const practiceSetup = useRef<HTMLDetailsElement>(null)
  const requestedRunId = searchParams.get('run')
  const run = requestedRunId ? detail?.mock_interview_runs?.find((item) => item.id === requestedRunId) ?? null : latestRun(detail)
  const progress = interviewProgress(detail?.mock_interview_runs ?? [], run?.status === 'completed' ? run.id : undefined)
  const currentQuestion = run?.status === 'in_progress' ? run.questions.find((q) => !q.answer) ?? null : null
  const answeredCount = run?.questions.filter((q) => q.answer).length ?? 0
  const currentDraftKey = selectedId && run && currentQuestion ? draftKey(selectedId, run.id, currentQuestion.id) : null
  const answerDraft = currentDraftKey ? drafts[currentDraftKey] ?? '' : ''

  const shownRun = useRef<string | null>(null)
  useEffect(() => {
    if (!requestedRunId || !run || run.status !== 'in_progress' || run.input_mode === 'voice' || shownRun.current === run.id) return
    const panel = document.getElementById('interview-report')
    if (!panel) return
    shownRun.current = run.id
    panel.scrollIntoView({ block: 'start' })
    panel.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true })
  }, [requestedRunId, run])

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
        body: JSON.stringify({ mode, difficulty, questionCount, inputMode, interviewerId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOpError((payload?.error as string | undefined) ?? 'Could not start the mock interview.')
        return
      }
      applyRun(packageId, payload.run as MockInterviewRun)
      router.replace(`/mock-interview?package=${encodeURIComponent(packageId)}&run=${encodeURIComponent(payload.run.id)}${inputMode === 'voice' ? '&room=1' : ''}`, { scroll: false })
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
        <p role="alert" className="type-label text-alert">{listError}</p>
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

  if ((searchParams.get('room') === '1' || (requestedRunId && run?.status !== 'completed')) && selectedId && run?.input_mode === 'voice') {
    return <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#f5f7f5] font-redesign-sans">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-4 sm:h-16 sm:px-7">
        <Link href={`/mock-interview?package=${encodeURIComponent(selectedId)}`} className="shrink-0 text-sm font-semibold text-teal hover:underline">← Exit room</Link>
        <span className="min-w-0 truncate text-right text-xs font-semibold text-ink sm:text-sm">{run.target_job_title}</span>
      </header>
      {run.status === 'completed' ? <div className="mx-auto w-full max-w-[1100px] flex-1 overflow-y-auto px-3 py-4 sm:p-6">
        <InterviewReport key={run.id} run={run} previousScore={progress?.metrics.find(metric => metric.key === 'overall_score')?.previous} answers={<VoiceInterview key={`${selectedId}.${run.id}`} packageId={selectedId} run={run} onUpdated={picker.reloadDetail} reviewOnly />} />
      </div> : <VoiceInterview key={`${selectedId}.${run.id}`} packageId={selectedId} run={run} onUpdated={picker.reloadDetail} room />}
    </div>
  }

  if (requestedRunId && selectedId && run?.status === 'completed') {
    const attemptNumber = orderedAttempts(detail?.mock_interview_runs ?? []).findIndex(item => item.id === run.id) + 1
    return <main className="studio-page studio-report-page">
      <header className="studio-report-page-heading"><h1>Practice report</h1><span>Attempt {attemptNumber}</span></header>
      <Link className="inline-flex min-h-11 items-center gap-2 text-teal hover:underline" href={`/mock-interview?package=${encodeURIComponent(selectedId)}`}><ArrowLeft size={17} aria-hidden="true" />Back to interview journey</Link>
      <InterviewReport key={run.id} run={run} previousScore={progress?.metrics.find(metric => metric.key === 'overall_score')?.previous} practiceHref={`/mock-interview?package=${encodeURIComponent(selectedId)}&setup=1`} answers={run.input_mode === 'voice' ? <VoiceInterview key={`${selectedId}.${run.id}`} packageId={selectedId} run={run} onUpdated={picker.reloadDetail} reviewOnly /> : undefined} />
    </main>
  }

  const unanswered = run ? run.questions.length - answeredCount : 0

  // The focus room uses the existing draft and submit/finish paths. Back opens
  // setup without an answering form; the saved attempt remains available there.
  if (run && run.status !== 'completed' && run.input_mode !== 'voice' && selectedId && searchParams.get('setup') !== '1') {
    return <main id="interview-report" className="studio-interview-room">
      <header className="studio-focus-topbar"><Link className="studio-text-link" href={`/mock-interview?package=${encodeURIComponent(selectedId)}&setup=1`}><ArrowLeft size={17} aria-hidden="true" />Back to practice</Link><span>{currentQuestion ? `Question ${answeredCount + 1} of ${run.questions.length}` : 'Ready to finish'}</span></header>
      <div className="studio-focus-body">
        <section className="studio-focus-context"><h2>{run.target_job_title}</h2><p>{run.mode.replaceAll('_', ' ')} · {run.difficulty} · {run.questions.length} questions</p></section>
        <progress max={run.questions.length || 1} value={answeredCount} aria-label="Saved interview answers" />
        {opError ? <p role="alert" className="text-alert">{opError}</p> : null}
        {currentQuestion ? <>
          <h1>{currentQuestion.question}</h1>
          <label className="studio-answer-field"><span className="sr-only">Your answer</span><textarea className="field" value={answerDraft} onChange={event => setAnswerDraft(event.target.value)} rows={7} maxLength={MOCK_ANSWER_MAX_CHARS} placeholder="Type your answer…" aria-describedby="answer-count" /><span id="answer-count">{answerDraft.length.toLocaleString('en-US')} / {MOCK_ANSWER_MAX_CHARS.toLocaleString('en-US')}</span></label>
          <div className="studio-focus-actions"><Button type="button" variant="primary" onClick={() => void submitAnswer()} disabled={!answerDraft.trim() || busy !== null} busy={busy === 'answer'} busyLabel="Reviewing…">Submit answer</Button>
            {answeredCount > 0 ? <details className="studio-finish-options"><summary>Finish this attempt early</summary><p>Finishing now reviews your {answeredCount} saved {answeredCount === 1 ? 'answer' : 'answers'} only; the other {unanswered} are skipped. A finished report is final. Your current unsent answer will not be included.</p><Button type="button" variant="secondary" onClick={() => void finish()} disabled={busy !== null} busy={busy === 'finish'} busyLabel="Finishing…">Finish and get report</Button></details> : null}
          </div>
        </> : <><h1>All answers saved</h1><p>Finish this attempt to receive your practice report.</p><Button type="button" variant="primary" onClick={() => void finish()} disabled={busy !== null} busy={busy === 'finish'} busyLabel="Finishing…">Finish and get report</Button></>}
        {answeredCount > 0 ? <details className="studio-saved-answers"><summary>Saved answers · {answeredCount}</summary>{run.questions.filter(question => question.answer).map(question => <article key={question.id}><h2>{question.question}</h2><p className="whitespace-pre-wrap">{question.answer}</p>{question.feedback ? <p>{question.feedback}</p> : null}</article>)}</details> : null}
      </div>
    </main>
  }

  return (
    <PageShell
      icon={ChatBubbleLeftRightIcon}
      eyebrow={stageEyebrow('apply')}
      title="Prepare your mock interview"
      className="mock-interview-page"
      subtitle={isRaw ? 'Practise from your saved profile and leave with a clear improvement plan.' : 'Practise your answers. Leave with a clear improvement plan.'}
      uses={isRaw ? ['Profile Resume', 'Saved Career Profile'] : ['Optimized Resume', 'Job You’re Applying For', 'Career Profile']}
    >
      <Card tone="light" className="p-4 sm:p-6">
        {total === 0 ? (
          <StageGate what="Your mock interview" />
        ) : list.length === 0 ? (
          <EmptyState
            tone="inline"
            icon={ChatBubbleLeftRightIcon}
            className="border-0 bg-transparent"
            title="Build an optimized resume first"
            body="The mock interview uses the final resume and job description, so create that package first."
            action={<Link href="/optimize/target" className={buttonVariants({ variant: 'primary' })}>{CTA.optimizeCv}</Link>}
          />
        ) : (
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Which resume are you practising from?</span>
              {/* Locked while a request is running, so a reply can never land on a different job. */}
              <select
                value={selectedId ?? ''}
                onChange={(e) => {
                  setOpError(null)
                  setSelectedId(e.target.value)
                  router.replace(`/mock-interview?package=${encodeURIComponent(e.target.value)}`, { scroll: false })
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
            {selectedSummary ? <PreparationJourney bare pkg={detail ?? selectedSummary} current={run?.status === 'completed' ? 'report' : 'mock'} /> : null}

            <details ref={practiceSetup} className="group" open={searchParams.get('setup') === '1' || (detail?.mock_interview_runs?.length ?? 0) === 0 || Boolean(opError || detailError || busy)}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-teal [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><Mic size={18} aria-hidden="true" />Start a new practice</span><ChevronRight size={18} className="group-open:rotate-90" aria-hidden="true" /></summary>
              <div className="mt-4 flex flex-col gap-5">
            <fieldset className="space-y-3">
              <legend className="type-card">How would you like to practise?</legend>
              <div className="interview-answer-methods grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                {([{ value: 'voice', label: 'Voice interview', body: 'Speak your answers' }, { value: 'text', label: 'Type answers', body: 'Write at your own pace' }] as const).map(option => <button key={option.value} type="button" aria-pressed={inputMode === option.value} onClick={() => setInputMode(option.value)} className={cn('min-h-14 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2', inputMode === option.value ? 'border-teal bg-teal-soft text-teal' : 'border-line bg-white text-ink hover:border-teal/60')}><span className="interview-method-icon" aria-hidden="true">{option.value === 'voice' ? <Mic size={24} /> : <MessageSquare size={24} />}</span><span className="block type-label">{option.label}</span><span className="mt-1 block type-helper text-ink-muted">{option.body}</span></button>)}
              </div>
              <p className="field-hint">Voice practice uses your microphone. Your answers are saved for review; this is not a live video call.</p>
            </fieldset>
            {inputMode === 'voice' ? <InterviewerPicker value={interviewerId} onChange={setInterviewerId} disabled={busy !== null} /> : null}
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Interview type</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as MockInterviewMode)} className="field">
                {MODES.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <span className="field-hint">{MODES.find(opt => opt.value === mode)?.body}</span>
            </label>

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

            {inputMode === 'voice' && voiceReady === false ? <p className="rounded-ctl bg-canvas p-3 text-sm text-ink-muted type-helper">Recorded interviews are being prepared. Your previous interview reports remain available.</p> : null}
            {opError ? <p role="alert" className="rounded-ctl border border-alert/40 bg-alert-soft px-3.5 py-3 type-helper text-alert">{opError}</p> : null}
            {detailError ? (
              <div className="flex flex-col items-start gap-2">
                <p role="alert" className="rounded-ctl border border-alert/40 bg-alert-soft px-3.5 py-3 type-helper text-alert">{detailError}</p>
                <Button type="button" variant="secondary" onClick={picker.reloadDetail}>Try again</Button>
              </div>
            ) : null}
            {busy === 'start' ? (
              // Joining a call, not loading a page (founder, 2026-10-03).
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-canvas/95 backdrop-blur-sm">
                <CallOrb label="Connecting" title="Getting your interview ready" lines={JOINING_LINES} />
              </div>
            ) : busy ? (
              <ProcessingInline
                steps={busy === 'answer' ? ['Reviewing your answer', 'Checking structure and evidence', 'Preparing feedback'] : ['Reading your answers', 'Reviewing each answer', 'Writing your preparation report']}
                stepMs={4500}
                notes={NOTES}
              />
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="type-helper text-ink-muted">
                {detailLoading && !detail
                  ? (isRaw ? 'Loading your Profile Resume…' : 'Loading this job…')
                  : run
                    ? 'Your saved interview remains in your history below.'
                    : 'No mock interview yet for this package.'}
              </p>
              <Button type="button" variant="primary" onClick={() => void start()} disabled={!selectedId || busy !== null || !detail || (inputMode === 'voice' && voiceReady !== true)} busy={busy === 'start'} busyLabel="Starting…">
                {CTA.startMockInterview}
              </Button>
            </div>
              </div>
            </details>
          </div>
        )}
      </Card>

      {selectedId && run?.status === 'in_progress' ? (
        <Card tone="light" className="flex flex-col gap-3 border-teal/40 bg-teal-soft/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="type-card font-semibold text-ink">Your interview is ready to continue</h2>
            <p className="mt-1 type-helper text-ink-soft">{run.input_mode === 'voice' ? 'Reopen your saved questions and recordings.' : `${answeredCount} of ${run.question_count} answers saved. Continue from your next unanswered question.`}</p>
          </div>
          <Link className={buttonVariants({ variant: 'primary', className: 'shrink-0' })} href={`/mock-interview?package=${encodeURIComponent(selectedId)}&run=${encodeURIComponent(run.id)}${run.input_mode === 'voice' ? '&room=1' : '#interview-report'}`}>Continue interview</Link>
        </Card>
      ) : null}

      {requestedRunId && detail && !run && !detailLoading ? <p role="alert" className="text-ink-muted">This interview is no longer available for the selected resume. Choose a saved attempt below.</p> : null}
      {detail && selectedId && (detail.mock_interview_runs?.length ?? 0) > 0 ? <section className="interview-history space-y-4" aria-label="Saved mock interviews">
        <div><h2 className="type-section">Your interview history</h2><p className="mt-1 text-sm text-ink-muted type-helper">All saved attempts for this resume. Open any interview to view its questions and report.</p></div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orderedAttempts(detail.mock_interview_runs ?? []).map((attempt, index) => <li key={attempt.id}>
            <Link href={`/mock-interview?package=${encodeURIComponent(selectedId)}&run=${encodeURIComponent(attempt.id)}${attempt.status !== 'completed' ? (attempt.input_mode === 'voice' ? '&room=1' : '#interview-report') : ''}`} className="group ui-card flex h-full min-w-0 flex-col gap-3 rounded-card border border-line bg-white p-4 transition-colors hover:border-teal hover:bg-teal-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
              <div className="flex items-center justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-teal-soft text-teal">{index + 1}</span><span className="flex items-center gap-1 rounded-full bg-canvas px-2 py-1 text-xs text-ink-muted">{attempt.status === 'completed' ? <CheckCircle2 size={13} aria-hidden="true" /> : <Mic size={13} aria-hidden="true" />}{attempt.status === 'completed' ? 'Reviewed' : 'In progress'}</span></div>
              <h3 className="type-card">Mock interview {index + 1}</h3><p className="text-sm text-ink-muted type-helper">{new Date(attempt.generated_at).toLocaleDateString()} · {attempt.mode.replaceAll('_', ' ')} · {attempt.difficulty}</p>
              <span className="mt-auto flex items-center justify-between border-t border-line pt-3 text-sm text-teal"><span>{attempt.status === 'completed' ? 'Explore result' : 'Continue practice'}</span><ChevronRight size={17} aria-hidden="true" /></span>
            </Link>
          </li>)}
        </ul>
        {progress && <InterviewProgress packageId={selectedId} progress={progress} onPractice={() => { if (practiceSetup.current) { practiceSetup.current.open = true; practiceSetup.current.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); practiceSetup.current.querySelector('select')?.focus({ preventScroll: true }) } }} />}
      </section> : null}

      {selectedId && run?.status === 'completed' ? (
        <NextStep
          className="mt-6"
          title={isRaw ? 'Keep preparing in your field' : 'Apply, then keep track'}
          body={isRaw ? 'Your profile-based practice is saved in your Resume Library. Return any time to review or practise again.' : 'Your resume, letter and preparation for this job are ready. When you apply, set its stage in your Resume Library so you always know where each application stands.'}
          href="/dashboard/library"
          cta="Open my Resume Library"
          secondary={{ href: `/package/${encodeURIComponent(selectedId)}`, label: isRaw ? 'See your resume' : CTA.viewOptimizedCv }}
        />
      ) : null}

      <p className="mt-6 text-center type-helper text-ink-muted">
        Typed and recorded voice practice in English. Feedback supports preparation; it does not predict hiring decisions.
      </p>
    </PageShell>
  )
}

export default function MockInterviewPage() {
  return (
    <Suspense>
      <MockInterviewScreen />
    </Suspense>
  )
}
