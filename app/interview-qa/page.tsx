'use client'

import { CAREER_RESUME_BADGE, isCareerProfileResume } from '@/lib/careerProfileResume'
import { Suspense, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { QuestionMarkCircleIcon, ChevronDownIcon, ClipboardDocumentIcon, ChatBubbleLeftRightIcon, LightBulbIcon, DocumentTextIcon, ArrowUturnRightIcon } from '@heroicons/react/24/outline'
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
import { usePackagePicker } from '@/lib/usePackagePicker'
import { SAVED_PER_PACKAGE, savedQaSets, type PackageSummary } from '@/lib/packageSummary'
import type { InterviewQuestionAnswer, InterviewQuestionCategory, InterviewQuestionSet } from '@/types/package'
import { stageEyebrow } from '@/components/journey/stages'
import { StageGate } from '@/components/journey/StageGate'

const QA_NOTES = [
  'Good answers sound specific because they are tied to your own project history.',
  'A Gulf interviewer often checks readiness for site conditions, client standards and visa practicalities.',
  'The strongest preparation is not memorising every word. It is knowing the story behind every claim.',
]

const CATEGORY_LABEL: Record<InterviewQuestionCategory, string> = {
  hr: 'HR',
  technical: 'Technical',
  project: 'Project',
  behavioral: 'Behavioral',
  gulf_readiness: 'Gulf readiness',
  company_role: 'Role fit',
}

const CATEGORY_ORDER: InterviewQuestionCategory[] = [
  'hr',
  'technical',
  'project',
  'behavioral',
  'gulf_readiness',
  'company_role',
]

function packageTarget(pkg: Pick<PackageSummary, 'tier' | 'name' | 'target_job_title' | 'target_company'>): string {
  if (isCareerProfileResume(pkg)) return `${pkg.name || pkg.target_job_title} · ${CAREER_RESUME_BADGE}`
  return [pkg.target_job_title, pkg.target_company].filter(Boolean).join(' · ')
}

function qaToText(set: InterviewQuestionSet): string {
  return set.questions
    .map((q, index) =>
      [
        `${index + 1}. ${q.question}`,
        `Answer: ${q.answer}`,
        `Why asked: ${q.why_asked}`,
        `Resume basis: ${q.resume_basis}`,
        q.follow_up ? `Follow-up: ${q.follow_up}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')
}

/**
 * Interview Q&A. LIST LIGHT, OPEN ONE (audit M08): the picker lists jobs whose
 * CV is built; only the chosen job's Q&A set is loaded. The picker is locked
 * while a set is being generated, so a reply cannot land on another job.
 */
function InterviewQaScreen() {
  const searchParams = useSearchParams()
  const requestedIdRef = useRef(searchParams.get('package'))
  const picker = usePackagePicker({ requestedId: requestedIdRef.current, onlyWithResume: true })
  const { list, total, listError, selectedId, setSelectedId, selectedSummary, detail, detailError, detailLoading } = picker
  const isRaw = isCareerProfileResume(selectedSummary ?? {})
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())

  // Every set is kept (migration 065, 10 newest per job); the newest opens first.
  const [setId, setSetId] = useState<string | null>(null)
  const sets = useMemo(() => savedQaSets(detail), [detail])
  const questionSet = sets.find((x) => x.id === setId) ?? sets[0] ?? null
  const grouped = useMemo(() => {
    const map = new Map<InterviewQuestionCategory, InterviewQuestionAnswer[]>()
    for (const category of CATEGORY_ORDER) map.set(category, [])
    for (const item of questionSet?.questions ?? []) {
      map.set(item.category, [...(map.get(item.category) ?? []), item])
    }
    return CATEGORY_ORDER.map((category) => ({ category, items: map.get(category) ?? [] })).filter((g) => g.items.length > 0)
  }, [questionSet])

  async function generate() {
    if (!selectedId) return
    const packageId = selectedId
    setGenError(null)
    setGenerating(true)
    setCopied(false)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(packageId)}/interview-qa`, { method: 'POST' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setGenError((payload?.error as string | undefined) ?? 'Could not generate interview Q&A. Please try again.')
        return
      }
      const next = payload?.interview_questions as InterviewQuestionSet | undefined
      if (next) {
        picker.updateDetail(packageId, (p) => ({
          ...p,
          interview_questions: next,
          interview_question_sets: [...savedQaSets(p).reverse(), next].slice(-SAVED_PER_PACKAGE),
        }))
        setSetId(next.id)
        setOpenIds(new Set())
        picker.patchSummary(packageId, { qa_question_count: next.question_count })
      }
    } catch {
      setGenError('Could not reach the server. Check your connection and try again — nothing was used.')
    } finally {
      setGenerating(false)
    }
  }

  async function copyAll() {
    if (!questionSet) return
    try {
      await navigator.clipboard.writeText(qaToText(questionSet))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setGenError('Could not copy automatically. Select the answers and copy manually.')
    }
  }

  if (listError) {
    return (
      <main className="mx-auto flex w-full max-w-[960px] flex-col items-start gap-3 px-3 py-8 font-redesign-sans sm:px-8 lg:px-10">
        <div role="alert" className="rounded-card border border-alert/40 bg-alert-soft px-3.5 py-3 type-helper text-alert">
          {listError}
        </div>
        <Button type="button" variant="secondary" onClick={picker.reloadList}>
          Try again
        </Button>
      </main>
    )
  }

  if (list === null) {
    return (
      <main className="mx-auto w-full max-w-[960px] px-3 py-8 sm:px-8 lg:px-10 font-redesign-sans">
        <SkeletonGroup label="Loading interview preparation">
          <Skeleton shape="title" />
          <Skeleton />
          <Skeleton className="w-3/4" />
        </SkeletonGroup>
      </main>
    )
  }

  return (
    <PageShell
      className="interview-qa-page"
      width="document"
      icon={QuestionMarkCircleIcon}
      eyebrow={stageEyebrow('apply')}
      title="Interview Q&A"
      subtitle={isRaw ? 'Practise up to 25 questions from your profile. No job description needed.' : 'Practise for the Gulf job you are applying for, using your own experience.'}
      uses={isRaw ? ['Profile Resume', 'Saved Career Profile'] : ['Optimized Resume', 'Job You’re Applying For', 'Career Profile']}
    >
      <Card tone="light" className="qa-setup-panel">
        {total === 0 ? (
          <StageGate what="Interview Q&A" />
        ) : list.length === 0 ? (
          <EmptyState
            tone="inline"
            icon={QuestionMarkCircleIcon}
            className="border-0 bg-transparent"
            title="Build an optimized resume first"
            body="The questions and answers are based on the final resume for the job you are applying for, so build that resume before preparing interview answers."
            action={
              <Link href="/optimize/target" className={cn(buttonVariants({ variant: 'primary' }), 'type-label')}>
                {CTA.optimizeCv}
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Which resume are you preparing from?</span>
              <select
                value={selectedId ?? ''}
                onChange={(e) => {
                  setGenError(null)
                  setSetId(null)
                  setSelectedId(e.target.value)
                }}
                disabled={generating}
                className="field"
              >
                {list.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white text-ink">
                    {packageTarget(p)}
                  </option>
                ))}
              </select>
            </label>
            {selectedSummary ? <PreparationJourney bare pkg={detail ?? selectedSummary} current="qa" /> : null}

            {genError ? (
              <p role="alert" className="rounded-ctl border border-alert/40 bg-alert-soft px-3.5 py-3 type-helper text-alert">
                {genError}
              </p>
            ) : null}

            {generating ? (
              <ProcessingInline
                steps={[
                  isRaw ? 'Reading your saved Profile Resume' : 'Reading the optimized resume',
                  isRaw ? 'Preparing for your professional field' : 'Studying the target role and job description',
                  'Writing Gulf-focused practice answers',
                  'Checking every number against your resume and profile',
                ]}
                stepMs={5500}
                notes={QA_NOTES}
              />
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1 type-helper text-ink-soft">
                {selectedSummary ? (
                  <>{questionSet ? <span>Saved {new Date(questionSet.generated_at).toLocaleString()}</span> : null}</>
                ) : null}
              </div>
              <div className="qa-primary-actions flex flex-wrap gap-2">
                {questionSet ? (
                  <Button type="button" variant="secondary" onClick={() => void copyAll()}>
                    <ClipboardDocumentIcon aria-hidden="true" className="size-4 shrink-0" />
                    {copied ? 'Copied' : 'Copy all'}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void generate()}
                  disabled={!selectedId || generating || detailLoading}
                  busy={generating}
                  busyLabel="Generating…"
                >
                  {questionSet ? 'Prepare new interview Q&A' : CTA.prepareInterviewQa}
                </Button>
              </div>
            </div>
            {sets.length > 1 ? (
              <label className="flex flex-col gap-2">
                <span className="field-label">
                  Saved Q&amp;A sets for this {isRaw ? 'resume' : 'job'} ({sets.length} of {SAVED_PER_PACKAGE})
                </span>
                <select
                  className="field"
                  value={questionSet?.id ?? ''}
                  onChange={(e) => {
                    setSetId(e.target.value)
                    setOpenIds(new Set())
                  }}
                  disabled={generating}
                >
                  {sets.map((x, i) => (
                    <option key={x.id} value={x.id}>
                      {new Date(x.generated_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · {x.question_count} Qs{i === 0 ? ' · newest' : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {questionSet ? (
              <p className="type-caption leading-relaxed text-ink-muted">
                A new set is saved alongside your earlier ones. The {SAVED_PER_PACKAGE} newest are kept for each {isRaw ? 'resume' : 'job'}.
              </p>
            ) : null}
          </div>
        )}
      </Card>

      {detailError ? (
        <div className="mt-6 flex flex-col items-start gap-3">
          <p role="alert" className="rounded-ctl border border-alert/40 bg-alert-soft px-3.5 py-3 type-helper text-alert">
            {detailError}
          </p>
          <Button type="button" variant="secondary" onClick={picker.reloadDetail}>
            Try again
          </Button>
        </div>
      ) : detailLoading && !detail ? (
        <SkeletonGroup label={isRaw ? 'Loading your profile-based Q&A' : "Loading this job's Q&A"} className="mt-6">
          <Skeleton shape="title" />
          <Skeleton />
        </SkeletonGroup>
      ) : null}

      {questionSet ? (
        <section className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display type-section font-semibold text-ink">Practice set</h2>
              <p className="break-words type-helper text-ink-muted">
                {questionSet.question_count} questions for {questionSet.target_job_title}
                {questionSet.target_company ? ` · ${questionSet.target_company}` : ''}
              </p>
            </div>
            <span className="w-fit rounded-full bg-teal-soft px-3 py-1 type-caption font-semibold uppercase tracking-[0.08em] text-teal">
              Saved in this resume package
            </span>
          </div>

          {/* Practice first, answer second (2026-10-03): all 24 answers open made
              the page 22 phone screens long and gave the answer away before the
              candidate had tried. */}
          <div className="qa-practice-guide flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="type-helper leading-relaxed text-ink-soft">
              <strong className="qa-guide-title">How to practise</strong>
              Read each question and answer it out loud first, then tap <strong>Show sample answer</strong> to compare.{' '}
              <mark className="rounded bg-gold-soft px-1 text-ink">[Highlighted parts]</mark> are for your own real example.
            </p>
            <button
              type="button"
              aria-pressed={showAll}
              onClick={() => setShowAll((v) => !v)}
              className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'qa-show-all min-h-11 shrink-0' })}
            >
              {showAll ? 'Hide all answers' : 'Show all answers'}
            </button>
          </div>

          {grouped.map((group) => (
            <div key={group.category} className="flex flex-col gap-3">
              <h3 className="qa-group-heading">
                <span>{CATEGORY_LABEL[group.category]}</span>
                <span className="qa-group-count">{group.items.length} question{group.items.length === 1 ? '' : 's'}</span>
              </h3>
              {group.items.map((item) => (
                <QaCard
                  key={item.id}
                  item={item}
                  number={questionSet.questions.findIndex((q) => q.id === item.id) + 1}
                  open={showAll || openIds.has(item.id)}
                  onToggle={() =>
                    setOpenIds((ids) => {
                      const next = new Set(ids)
                      if (next.has(item.id)) next.delete(item.id)
                      else next.add(item.id)
                      return next
                    })
                  }
                />
              ))}
            </div>
          ))}
        </section>
      ) : null}

      {selectedId && questionSet ? (
        <NextStep
          className="mt-6"
          title="Practise your answers"
          body={isRaw ? 'Practise interview questions in your professional field and get a saved feedback report.' : 'Answer written interview questions for this job one at a time, and get a saved feedback report.'}
          href={`/mock-interview?package=${encodeURIComponent(selectedId)}`}
          cta={CTA.startMockInterview}
          secondary={{ href: `/package/${encodeURIComponent(selectedId)}`, label: isRaw ? 'See your resume' : CTA.viewOptimizedCv }}
        />
      ) : null}

      <p className="mt-6 text-center type-caption text-ink-muted">
        {isRaw ? 'Answers use only your saved Career Profile. Unsupported numbers are removed before you see them.' : "Answers are written from this job's saved resume and your Career Profile. Any answer stating a number that is in neither is removed before you see it."}
      </p>
    </PageShell>
  )
}

export default function InterviewQaPage() {
  return (
    <Suspense>
      <InterviewQaScreen />
    </Suspense>
  )
}

/** "[your example: ...]" in a sample answer, highlighted as the part the candidate fills in. */
function AnswerText({ text }: { text: string }) {
  return (
    <p className="qa-answer-text whitespace-pre-line">
      {text.split(/(\[[^\]]+\])/).map((part, i) =>
        /^\[[^\]]+\]$/.test(part) ? (
          <mark key={i} className="rounded bg-gold-soft px-1 text-ink">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </p>
  )
}

function QaCard({ item, number, open, onToggle }: { item: InterviewQuestionAnswer; number: number; open: boolean; onToggle: () => void }) {
  const answerId = `qa-answer-${item.id}`
  return (
    <article className="qa-question-card" aria-labelledby={`qa-question-${item.id}`}>
      <div className="qa-question-header">
        <div className="flex flex-wrap items-center gap-2">
          <span className="qa-question-number">Question {number.toString().padStart(2, '0')}</span>
          <span className="qa-difficulty">{item.difficulty}</span>
          {item.tags.slice(0, 2).map(tag => <span key={tag} className="qa-tag">{tag}</span>)}
        </div>
        <h4 id={`qa-question-${item.id}`} className="qa-question-title">{item.question}</h4>
      </div>
      <div className="qa-question-body">
        <div className="qa-why-panel">
          <h5 className="qa-panel-label"><LightBulbIcon aria-hidden="true" className="size-4 shrink-0" />Why they ask</h5>
          <p>{item.why_asked}</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={answerId}
          onClick={onToggle}
          className="qa-answer-toggle"
        >
          <span>{open ? 'Hide sample answer' : 'Show sample answer'}</span>
          <ChevronDownIcon aria-hidden="true" className={cn('size-4 shrink-0', open && 'rotate-180')} />
        </button>
        {open ? (
          <div id={answerId} className="qa-answer-content">
            <section className="qa-answer-panel" aria-label={`Sample answer for question ${number}`}>
              <h5 className="qa-panel-label"><ChatBubbleLeftRightIcon aria-hidden="true" className="size-4 shrink-0" />Sample answer</h5>
              <AnswerText text={item.answer} />
            </section>
            <div className="qa-evidence-grid">
              <section className="qa-basis-panel">
                <h5 className="qa-panel-label"><DocumentTextIcon aria-hidden="true" className="size-4 shrink-0" />From your resume</h5>
                <p>{item.resume_basis}</p>
              </section>
              {item.follow_up ? (
                <section className="qa-followup-panel">
                  <h5 className="qa-panel-label"><ArrowUturnRightIcon aria-hidden="true" className="size-4 shrink-0" />Likely follow-up</h5>
                  <p>{item.follow_up}</p>
                </section>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}
