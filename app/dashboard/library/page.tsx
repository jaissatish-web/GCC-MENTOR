'use client'
import { formatTrackerDate } from '@/lib/trackerDates'
import { CAREER_RESUME_BADGE, isCareerProfileResume } from '@/lib/careerProfileResume'
import { useCareerProfileResume } from '@/lib/useCareerProfileResume'

import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { buttonVariants } from '@/components/ui/Button'
import { CTA, NAMES } from '@/lib/serviceLabels'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageShell } from '@/components/layout/PageShell'
import { BriefcaseIcon, UserCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { StageSelect } from '@/components/package/StageSelect'
import { getTemplate } from '@/lib/templates'
import {
  cvReady as isCvReady,
  letterCount,
  mockDone,
  qaReady,
  type PackageListPage,
  type PackageSummary,
} from '@/lib/packageSummary'
import type { Package, PackageStatus } from '@/types/package'
import { TargetJobCard } from '@/components/package/TargetJobCard'
import { ServiceUsageLine, useServiceUsage } from '@/components/package/ServiceUsage'
import type { ServiceUsageCounts } from '@/app/api/service-usage/route'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

/**
 * Resume Library — route /dashboard/library.
 *
 * NAMED "TARGET JOBS" 2026-09-09 → 2026-09-11, then "Resume Library" again by
 * founder decision. The row is the JOB — role, employer, country, stage — and
 * the CV and letters are things that job has.
 *
 * Lightweight summaries are paged on the server. Search and stage filters
 * are intentionally absent; the Career Profile resume is always first.
 *
 * SAVED IS NOT APPLIED (audit M07). A new job starts as "Saved · not applied";
 * the user moves it on. Preparation progress (CV, letter, Q&A, mock) is shown
 * separately from the application stage.
 *
 * STATUS (PUT), RENAME (PATCH) and DELETE keep their optimistic-then-reconciled
 * behaviour.
 */

const PAGE_SIZE = 20

function levelLabel(level: string): string {
  return level.charAt(0).toUpperCase() + level.slice(1)
}

/**
 * Where this job is, in words a user would use. `generic_gulf` returns null:
 * it is what the form stores when nobody chose a country.
 */
function countryLabel(value: string | null): string | null {
  if (!value || value === 'generic_gulf') return null
  return GULF_COUNTRIES.find((c) => c.value === value)?.label ?? null
}

function templateNameFor(id?: string | null): string {
  return getTemplate(id).name
}

/** Resume names are edited explicitly from each Library card. */
function NameField({
  value,
  fallback,
  onSave,
}: {
  value: string
  fallback: string
  onSave: (next: string) => Promise<boolean>
}) {
  const shown = value || fallback
  const [draft, setDraft] = useState(shown)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const close = () => {
    setEditing(false)
    window.requestAnimationFrame(() => buttonRef.current?.focus())
  }
  const save = async () => {
    if (saving) return
    const next = draft.trim()
    if (next === shown.trim()) { close(); return }
    setSaving(true)
    try {
      if (await onSave(next === fallback.trim() ? '' : next)) close()
    } finally {
      setSaving(false)
    }
  }

  return editing ? (
    <form className="flex flex-col gap-2 rounded-ctl border border-line bg-canvas p-3" aria-label={`Rename ${shown}`} onSubmit={(e) => { e.preventDefault(); void save() }}>
      <label className="flex flex-col gap-1 type-helper font-semibold text-ink">
        Resume name
        <input
          ref={inputRef}
          type="text"
          value={draft}
          placeholder={fallback}
          maxLength={120}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape' && !saving) { e.preventDefault(); close() } }}
          className="field w-full"
        />
      </label>
      <div className="ui-action-group">
        <button type="submit" disabled={saving} className={buttonVariants({ variant: 'primary', size: 'sm' })}>{saving ? 'Saving…' : 'Save name'}</button>
        <button type="button" disabled={saving} onClick={close} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>Cancel</button>
      </div>
    </form>
  ) : (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => { setDraft(shown); setEditing(true) }}
      className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'self-start')}
    >
      Edit resume name
    </button>
  )
}

/** What this job already has. A dashed chip is an invitation to make it. */
function ArtifactChip({ label, present }: { label: string; present: boolean }) {
  return (
    <span
      className={cn(
        'rounded-[4px] px-2 py-1 type-caption font-semibold leading-none',
        present
          ? 'bg-ok-soft text-ok'
          : 'border border-dashed border-line-strong bg-canvas text-ink-muted'
      )}
    >
      {label}
    </span>
  )
}

/** Employer · country, with nothing invented and nothing empty printed. */
function JobSubtitle({ pkg }: { pkg: PackageSummary }) {
  const parts = [pkg.target_company, countryLabel(pkg.target_country)].filter(Boolean) as string[]
  // The date already has its own line under the title (2026-09-23).
  if (parts.length === 0) return null
  return <span className="block break-words type-helper font-medium text-ink-soft">{parts.join(' · ')}</span>
}

function ApplicationCard({
  pkg,
  usage,
  confirmingDelete,
  onRename,
  onStage,
  onDelete,
}: {
  pkg: PackageSummary
  usage: ServiceUsageCounts | undefined
  confirmingDelete: boolean
  onRename: (next: string) => Promise<boolean>
  onStage: (next: PackageStatus) => void
  onDelete: () => void
}) {
  const isRaw = isCareerProfileResume(pkg)
  const letterPresent = letterCount(pkg) > 0
  const cvReady = isCvReady(pkg)
  const qaIsReady = qaReady(pkg)
  const mockIsDone = mockDone(pkg)
  const readyCount = Number(cvReady) + Number(letterPresent) + Number(qaIsReady) + Number(mockIsDone)
  const totalCount = 4
  // The saved target job (title, job description, ATS score) is loaded only
  // when the user opens it: list summaries stay light (audit M08).
  const [targetOpen, setTargetOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detail, setDetail] = useState<Package | null>(null)
  const [detailState, setDetailState] = useState<'idle' | 'loading' | 'error'>('idle')
  const toggleTarget = () => {
    const next = !targetOpen
    setTargetOpen(next)
    if (next && !detail && detailState !== 'loading') {
      setDetailState('loading')
      fetch(`/api/packages/${encodeURIComponent(pkg.id)}`, { cache: 'no-store' })
        .then((res) => (res.ok ? (res.json() as Promise<{ package?: Package }>) : Promise.reject(new Error(String(res.status)))))
        .then((data) => {
          if (!data?.package) throw new Error('shape')
          setDetail(data.package)
          setDetailState('idle')
        })
        .catch(() => setDetailState('error'))
    }
  }
  const trackerItems = [
    pkg.application_deadline ? `Deadline ${formatTrackerDate(pkg.application_deadline)}` : null,
    pkg.interview_date ? `Interview ${formatTrackerDate(pkg.interview_date, true)}` : null,
    pkg.job_url ? 'Job link saved' : null,
  ].filter(Boolean) as string[]
  const id = encodeURIComponent(pkg.id)
  // THE ONE NEXT THING for this job (2026-09-23) — the same order the dashboard
  // uses: CV, then letter, then Q&A, then practice.
  const next = !cvReady
    ? { label: CTA.optimizeCv, href: `/package/${id}` }
    : !letterPresent
      ? { label: CTA.writeCoverLetter, href: `/cover-letter?package=${id}` }
      : !qaIsReady
        ? { label: CTA.prepareInterviewQa, href: `/interview-qa?package=${id}` }
        : !mockIsDone
          ? { label: CTA.startMockInterview, href: `/mock-interview?package=${id}` }
          : null
  const steps = [
    { label: NAMES.resume, count: null, done: cvReady, href: `/package/${id}` },
    { label: NAMES.coverLetter, count: Math.max(usage?.cover_letter ?? 0, letterCount(pkg)), done: letterPresent, href: `/cover-letter?package=${id}` },
    { label: NAMES.interviewQa, count: usage ? Math.max(usage.qa, qaIsReady ? 1 : 0) : qaIsReady ? null : 0, done: qaIsReady, href: `/interview-qa?package=${id}` },
    { label: NAMES.mockInterview, count: usage ? Math.max(usage.mock_started, mockIsDone ? 1 : 0) : mockIsDone ? null : 0, done: mockIsDone, href: `/mock-interview?package=${id}` },
  ]
  const displayName = (pkg.name ?? '').trim() || pkg.target_job_title

  return (
    <Dialog.Root open={detailsOpen} onOpenChange={setDetailsOpen}>
    <article data-resume-kind={isRaw ? 'career-profile' : 'optimized'} className="ui-surface library-resume-card flex min-w-0 flex-col gap-3 bg-white sm:gap-4">
      {/* Who and where — the title opens this job's workspace. */}
      <div className="library-resume-card-heading flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          {isRaw ? <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold-soft px-3 py-1 type-caption font-semibold text-gold-ink"><UserCircleIcon className="size-4" aria-hidden="true" />{CAREER_RESUME_BADGE}</span> : null}
          <Link
            href={`/package/${id}`}
            className="block break-words rounded-ctl type-card text-ink underline-offset-4 hover:text-navy-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-deep"
          >
            {displayName}
          </Link>
          <div className="mt-0.5 min-w-0">
            {isRaw ? <span className="block type-helper text-ink-soft">Career Profile · No job description</span> : <JobSubtitle pkg={pkg} />}
          </div>
          {/* What tells two jobs with the same title apart. */}
          <p className="mt-1 type-caption text-ink-muted">
            {isRaw ? 'No AI optimization' : `${levelLabel(pkg.optimization_level)} optimization`} · added {formatTrackerDate(pkg.created_at)}
            {pkg.updated_at && pkg.updated_at.slice(0, 10) !== pkg.created_at.slice(0, 10) ? ` · updated ${formatTrackerDate(pkg.updated_at)}` : ''}
          </p>
        </div>
        {!isRaw ? <StageSelect value={pkg.status} onChange={onStage} className="self-start" /> : null}
      </div>

      {/* Preparation for this job: four steps, each one tap away. */}
      <ol aria-label={`Preparation: ${readyCount} of ${totalCount} ready`} className="mt-auto grid grid-cols-1 gap-1.5 min-[360px]:grid-cols-2">
        {steps.map((st) => (
          <li key={st.label} className="min-w-0">
            <Link
              href={st.href}
              className={cn(
                'library-service-row flex min-h-12 items-center justify-between gap-2 rounded-ctl border px-3 py-2 type-helper font-semibold leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-deep',
                st.done ? 'border-ok/30 bg-ok-soft text-ok' : 'border-dashed border-line-strong bg-canvas text-ink-muted hover:border-gold/50',
              )}
            >
              {st.label === NAMES.resume ? <span className="flex min-w-0 flex-1 items-center justify-center gap-2"><span aria-hidden="true">{st.done ? '✓' : '○'}</span>{st.label}</span> : <>
                <span className="min-w-0 break-words">{st.label}</span>
                <span className="library-service-count" aria-label={st.count === null ? 'Count unavailable' : `${st.count} used`}>{st.count ?? '—'}</span>
              </>}
              <span className="sr-only">{st.done ? 'ready' : 'not yet'}</span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        {next ? (
          <Link href={next.href} className={cn(buttonVariants({ variant: 'progress', size: 'sm' }), 'col-span-2 min-h-11 w-full whitespace-normal break-words text-center')}>
            Next: {next.label}
          </Link>
        ) : (
          <span className="col-span-2 flex min-h-11 items-center justify-center rounded-ctl bg-ok-soft px-3 py-2.5 text-center type-helper font-semibold text-ok">
            {isRaw ? 'Your career preparation is ready' : 'Ready to apply — every step done'}
          </span>
        )}
        <Link href={`/package/${id}`} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'min-h-11 min-w-0 w-full whitespace-normal text-center')}>
          Open workspace
        </Link>
        <Dialog.Trigger asChild><button
          type="button"
          className="min-h-11 rounded-ctl border border-line px-4 type-helper font-semibold text-navy-deep underline-offset-2 hover:bg-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-deep"
        >
          Details
        </button></Dialog.Trigger>
      </div>

      {detailsOpen ? (
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
          <Dialog.Content className="app-type internal-ui fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 flex max-h-[85dvh] min-w-0 flex-col overflow-hidden rounded-card border border-line bg-white shadow-m-drawer focus:outline-none sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[calc(100%_-_2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line p-4 sm:p-5">
              <div className="min-w-0">
                <Dialog.Title className="type-card font-semibold text-ink">Resume details</Dialog.Title>
                <Dialog.Description className="mt-1 break-words type-helper text-ink-soft">{displayName}</Dialog.Description>
              </div>
              <Dialog.Close asChild><button type="button" aria-label="Close resume details" className="flex size-11 shrink-0 items-center justify-center rounded-ctl border border-line text-navy-deep hover:bg-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-deep"><XMarkIcon aria-hidden="true" className="size-5" /></button></Dialog.Close>
            </div>
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain break-words p-4 sm:p-5">
          <NameField value={pkg.name ?? ''} fallback={pkg.target_job_title} onSave={onRename} />
          <ServiceUsageLine
            counts={
              usage
                ? {
                    ...usage,
                    cover_letter: Math.max(usage.cover_letter, letterCount(pkg)),
                    qa: Math.max(usage.qa, qaIsReady ? 1 : 0),
                    mock_started: Math.max(usage.mock_started, mockIsDone ? 1 : 0),
                  }
                : undefined
            }
          />
          {trackerItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {trackerItems.map((item) => (
                <span key={item} className="rounded-full border border-line bg-canvas px-2.5 py-1 type-caption font-semibold text-ink-soft">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          {!isRaw ? <div>
            <button
              type="button"
              aria-expanded={targetOpen}
              onClick={toggleTarget}
              className="min-h-11 type-helper font-semibold text-navy-deep underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-deep"
            >
              {targetOpen ? 'Hide Job Details' : `${CTA.viewTargetJob} and ATS score`}
            </button>
            {targetOpen ? (
              detail ? (
                <TargetJobCard pkg={detail} className="mt-1 shadow-none" />
              ) : detailState === 'error' ? (
                <p className="type-helper text-alert">Could not load this job. Try again.</p>
              ) : (
                <p className="type-helper text-ink-muted" role="status">Loading job details…</p>
              )
            ) : null}
          </div> : <p className="type-helper text-ink-soft">Cover letters, Q&A and mock interviews use your latest saved Career Profile. No vacancy or employer is assumed.</p>}
          <div className="flex flex-wrap items-center gap-2">
            {cvReady ? (
              <Link href={isRaw ? '/profile?view=details' : `/package/${id}/edit`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                {isRaw ? 'Edit Career Profile' : CTA.editCv}
              </Link>
            ) : null}
            {!isRaw ? <button
              type="button"
              onClick={onDelete}
              aria-pressed={confirmingDelete}
              className={cn(buttonVariants({ variant: confirmingDelete ? 'danger-solid' : 'danger', size: 'sm' }), 'max-w-full whitespace-normal text-left')}
            >
              {confirmingDelete ? 'Confirm: delete this job and its documents' : 'Delete'}
            </button> : null}
          </div>
          <p className="type-caption text-ink-muted">{templateNameFor(pkg.template_id)} template</p>
        </div>
          </Dialog.Content>
        </Dialog.Portal>
      ) : null}
    </article>
    </Dialog.Root>
  )
}

export default function TargetJobsPage() {
  const { usage } = useServiceUsage()
  const careerResume = useCareerProfileResume()
  const { resume: careerProfileResume, setResume: setCareerProfileResume } = careerResume
  const [items, setItems] = useState<PackageSummary[] | null>(null)
  const [cursor, setCursor] = useState<PackageListPage['next_cursor']>(null)
  const [total, setTotal] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [opError, setOpError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searching, setSearching] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const requestSeq = useRef(0)

  // Lightweight paged summaries; the base resume is pinned separately.
  useEffect(() => {
    const seq = ++requestSeq.current
    setSearching(true)
    setLoadError(null)
    const qs = new URLSearchParams({ view: 'summary', limit: String(PAGE_SIZE), counts: '1' })
    fetch(`/api/packages?${qs.toString()}`, { cache: 'no-store' })
      .then((res) => {
        if (res.ok) return res.json() as Promise<PackageListPage>
        throw new Error(String(res.status))
      })
      .then((data) => {
        if (seq !== requestSeq.current) return
        setItems(data.packages ?? [])
        setCursor(data.next_cursor)
        if (typeof data.total === 'number') setTotal(data.total)
      })
      .catch(() => {
        if (seq === requestSeq.current) setLoadError('Could not load your Resume Library. Check your connection and try again.')
      })
      .finally(() => {
        if (seq === requestSeq.current) setSearching(false)
      })
  }, [reloadKey])

  async function loadMore() {
    if (!cursor || loadingMore) return
    const seq = requestSeq.current
    setLoadingMore(true)
    setOpError(null)
    const qs = new URLSearchParams({ view: 'summary', limit: String(PAGE_SIZE), before: cursor.before, before_id: cursor.before_id })
    try {
      const res = await fetch(`/api/packages?${qs.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as PackageListPage
      if (seq !== requestSeq.current) return
      setItems((prev) => {
        const seen = new Set((prev ?? []).map((p) => p.id))
        return [...(prev ?? []), ...(data.packages ?? []).filter((p) => !seen.has(p.id))]
      })
      setCursor(data.next_cursor)
    } catch {
      setOpError('Could not load more jobs. Check your connection and try again.')
    } finally {
      setLoadingMore(false)
    }
  }

  const changeStatus = useCallback(
    async (id: string, next: PackageStatus) => {
      if (!items) return
      setOpError(null)
      const prev = items.find((p) => p.id === id)
      if (!prev || prev.status === next) return
      const apply = (from: PackageStatus, to: PackageStatus) => {
        setItems((list) => (list ? list.map((p) => (p.id === id ? { ...p, status: to } : p)) : list))
      }
      // Optimistic update, then reconcile on failure.
      apply(prev.status, next)
      try {
        const res = await fetch(`/api/packages/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          apply(next, prev.status)
          setOpError((body?.error as string) ?? 'Could not update the stage.')
        }
      } catch {
        apply(next, prev.status)
        setOpError('Network error. Could not update the stage.')
      }
    },
    [items]
  )

  const renamePackage = useCallback(
    async (id: string, next: string) => {
      setOpError(null)
      const raw = careerProfileResume?.id === id
      const prevName = raw ? careerProfileResume?.name ?? null : items?.find((p) => p.id === id)?.name ?? null
      if (raw) setCareerProfileResume((prev) => prev ? { ...prev, name: next || null } : prev)
      setItems((list) => (list ? list.map((p) => (p.id === id ? { ...p, name: next || null } : p)) : list))
      try {
        const res = await fetch(`/api/packages/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: next }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setItems((list) => (list ? list.map((p) => (p.id === id ? { ...p, name: prevName } : p)) : list))
          if (raw) setCareerProfileResume((prev) => prev ? { ...prev, name: prevName } : prev)
          setOpError((body?.error as string) ?? 'Could not rename this resume.')
          return false
        }
        return true
      } catch {
        setItems((list) => (list ? list.map((p) => (p.id === id ? { ...p, name: prevName } : p)) : list))
        if (raw) setCareerProfileResume((prev) => prev ? { ...prev, name: prevName } : prev)
        setOpError('Network error. Could not rename this resume.')
        return false
      }
    },
    [items, careerProfileResume, setCareerProfileResume]
  )

  const deletePackage = useCallback(async (id: string) => {
    setOpError(null)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setOpError((body?.error as string) ?? 'Could not delete this job.')
        setConfirmingDelete(null)
        return
      }
      setItems((list) => {
        return list ? list.filter((p) => p.id !== id) : list
      })
      setTotal((t) => Math.max(0, t - 1))
      setConfirmingDelete(null)
    } catch {
      setOpError('Network error. Could not delete this job.')
      setConfirmingDelete(null)
    }
  }, [])

  if (items === null && !loadError) {
    return (
      <SkeletonGroup label="Loading your Resume Library" className="py-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-card border border-line bg-white p-4">
            <Skeleton shape="title" className="mb-2.5" />
            <Skeleton className="w-2/3" />
          </div>
        ))}
      </SkeletonGroup>
    )
  }

  if (loadError && items === null) {
    return (
      <div className="flex items-center justify-center px-5 py-20">
        <div className="flex flex-col gap-4">
          <Alert variant="danger">{loadError}</Alert>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className={buttonVariants({ variant: 'secondary' })}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  const list = items ?? []
  const raw = careerResume.resume
  const resumeList = [
    ...(raw ? [raw] : list.filter(isCareerProfileResume)),
    ...list.filter((resume) => !isCareerProfileResume(resume)),
  ]

  return (
    // The shared page frame (2026-09-23): the Library was the one list screen
    // drawing its own header, at its own size and padding.
    <PageShell
      width="document"
      icon={BriefcaseIcon}
      title="Resume Library"
      subtitle="Your resumes and applications for Gulf jobs."
      actions={
        total > 0 ? (
          <Link href="/optimize/target" className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'shrink-0')}>
            {CTA.addTargetJob}
          </Link>
        ) : null
      }
    >


      {searching ? <p role="status" className="type-helper text-ink-muted">Loading your resumes…</p> : null}

      {opError ? <Alert variant="danger">{opError}</Alert> : null}
      {loadError && items !== null ? <Alert variant="danger">{loadError}</Alert> : null}

      {total === 0 && !raw && careerResume.state === 'missing' ? (
        <EmptyState
          icon={BriefcaseIcon}
          title="Save your Career Profile to see your resume"
          body="Upload a resume, paste its text or enter your information. Your saved profile becomes your resume."
          action={
            <Link href="/profile" className={buttonVariants({ variant: 'primary' })}>
              Build Career Profile
            </Link>
          }
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2 xl:gap-6">
        {careerResume.state === 'loading' ? <div role="status" className="rounded-card border border-line bg-white p-5 type-helper text-ink-soft">Opening your Profile Resume…</div> : null}
        {careerResume.state === 'error' ? <div role="alert" className="rounded-card border border-line bg-white p-5"><p className="type-helper text-alert">Could not open your Profile Resume.</p><button type="button" className={buttonVariants({ variant: 'secondary', size: 'sm' })} onClick={careerResume.reload}>Try again</button></div> : null}
        {resumeList.map((pkg) => (
          <ApplicationCard
            key={pkg.id}
            pkg={pkg}
            usage={usage?.by_package[pkg.id]}
            confirmingDelete={confirmingDelete === pkg.id}
            onRename={(next) => renamePackage(pkg.id, next)}
            onStage={(s) => changeStatus(pkg.id, s)}
            onDelete={() =>
              confirmingDelete === pkg.id ? deletePackage(pkg.id) : setConfirmingDelete(pkg.id)
            }
          />
        ))}
      </div>

      {cursor ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className={buttonVariants({ variant: 'secondary' })}
          >
            {loadingMore ? 'Loading…' : 'Load more jobs'}
          </button>
        </div>
      ) : null}
    </PageShell>
  )
}
