'use client'

import { Suspense, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { PreparationJourney } from '@/components/package/PreparationJourney'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Button, buttonVariants } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProcessingInline } from '@/components/ui/Processing'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { CTA } from '@/lib/serviceLabels'
import { usePackagePicker } from '@/lib/usePackagePicker'
import type { PackageSummary } from '@/lib/packageSummary'
import type { InterviewQuestionAnswer, InterviewQuestionCategory, InterviewQuestionSet } from '@/types/package'

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

function packageTarget(pkg: Pick<PackageSummary, 'target_job_title' | 'target_company'>): string {
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
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const questionSet = detail?.interview_questions ?? null
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
        picker.updateDetail(packageId, (p) => ({ ...p, interview_questions: next }))
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
        <div role="alert" className="rounded-card border border-alert/40 bg-alert-soft px-3.5 py-3 text-[13px] text-alert">
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
      title="Interview Q&A"
      subtitle="Generate up to 25 role-specific answers from your optimized CV and its target job."
    >
      {selectedSummary ? <PreparationJourney pkg={detail ?? selectedSummary} current="qa" /> : null}
      <Card tone="light" className="mt-5 p-5 sm:p-6">
        {total === 0 ? (
          <EmptyState
            tone="inline"
            icon={QuestionMarkCircleIcon}
            className="border-0 bg-transparent"
            title="Add a target job first"
            body="Interview Q&A is prepared for one job package, after the resume has been optimized for that role."
            action={
              <Link href="/optimize/target" className={cn(buttonVariants({ variant: 'primary' }), 'text-[14px]')}>
                {CTA.addTargetJob}
              </Link>
            }
          />
        ) : list.length === 0 ? (
          <EmptyState
            tone="inline"
            icon={QuestionMarkCircleIcon}
            className="border-0 bg-transparent"
            title="Build an optimized resume first"
            body="The questions and answers are based on the final CV for a target job, so build that CV before preparing interview answers."
            action={
              <Link href="/optimize/target" className={cn(buttonVariants({ variant: 'primary' }), 'text-[14px]')}>
                {CTA.optimizeCv}
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Which optimized resume should we prepare?</span>
              <select
                value={selectedId ?? ''}
                onChange={(e) => {
                  setGenError(null)
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

            {genError ? (
              <p role="alert" className="rounded-ctl border border-alert/40 bg-alert-soft px-3.5 py-3 text-[13px] text-alert">
                {genError}
              </p>
            ) : null}

            {generating ? (
              <ProcessingInline
                steps={[
                  'Reading the optimized resume',
                  'Studying the target role and job description',
                  'Writing Gulf-focused practice answers',
                  'Checking every number against your CV and profile',
                ]}
                stepMs={5500}
                notes={QA_NOTES}
              />
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                {selectedSummary ? (
                  <>
                    <span className="break-words">
                      For <strong className="text-ink">{packageTarget(selectedSummary)}</strong>
                    </span>
                    {questionSet ? <span>Saved {new Date(questionSet.generated_at).toLocaleString()}</span> : null}
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {questionSet ? (
                  <Button type="button" variant="secondary" onClick={() => void copyAll()}>
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
            {questionSet ? (
              <p className="text-[12px] leading-relaxed text-ink-muted">
                Regenerating replaces this saved set with a new one.
              </p>
            ) : null}
          </div>
        )}
      </Card>

      {detailError ? (
        <div className="mt-6 flex flex-col items-start gap-3">
          <p role="alert" className="rounded-ctl border border-alert/40 bg-alert-soft px-3.5 py-3 text-[13px] text-alert">
            {detailError}
          </p>
          <Button type="button" variant="secondary" onClick={picker.reloadDetail}>
            Try again
          </Button>
        </div>
      ) : detailLoading && !detail ? (
        <SkeletonGroup label="Loading this job's Q&A" className="mt-6">
          <Skeleton shape="title" />
          <Skeleton />
        </SkeletonGroup>
      ) : null}

      {questionSet ? (
        <section className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-[21px] font-semibold text-ink">Practice set</h2>
              <p className="break-words text-[12.5px] text-ink-muted">
                {questionSet.question_count} questions for {questionSet.target_job_title}
                {questionSet.target_company ? ` · ${questionSet.target_company}` : ''}
              </p>
            </div>
            <span className="w-fit rounded-full bg-teal-soft px-3 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-teal">
              Saved in this resume package
            </span>
          </div>

          {grouped.map((group) => (
            <div key={group.category} className="flex flex-col gap-3">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                {CATEGORY_LABEL[group.category]}
              </h3>
              {group.items.map((item) => (
                <Card key={item.id} tone="light" className="p-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-canvas px-2.5 py-1 font-mono text-[12px] font-semibold text-ink-soft">
                        Q{(questionSet.questions.findIndex((q) => q.id === item.id) + 1).toString().padStart(2, '0')}
                      </span>
                      <span className="rounded-full bg-teal-soft px-2.5 py-1 text-[12px] font-semibold text-teal">
                        {item.difficulty}
                      </span>
                      {item.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full border border-line bg-white px-2.5 py-1 text-[12px] text-ink-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h4 className="font-display text-[18px] font-semibold leading-snug text-ink">{item.question}</h4>
                    <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{item.answer}</p>
                    <div className="grid gap-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-ink-muted md:grid-cols-3">
                      <p>
                        <strong className="block text-ink-soft">Why asked</strong>
                        {item.why_asked}
                      </p>
                      <p>
                        <strong className="block text-ink-soft">Resume basis</strong>
                        {item.resume_basis}
                      </p>
                      {item.follow_up ? (
                        <p>
                          <strong className="block text-ink-soft">Follow-up</strong>
                          {item.follow_up}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </section>
      ) : null}

      <p className="mt-6 text-center text-[12px] text-ink-muted">
        Answers are written from this job&apos;s saved CV and your Career Profile. Any answer stating a number that is in neither is removed before you see it.
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
