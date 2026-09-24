'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/Button'
import { CTA } from '@/lib/serviceLabels'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageShell } from '@/components/layout/PageShell'
import { BriefcaseIcon } from '@heroicons/react/24/outline'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn, GULF_COUNTRIES, PACKAGE_STATUSES } from '@/lib/utils'
import { StageSelect } from '@/components/package/StageSelect'
import { getTemplate } from '@/lib/templates'
import {
  cvReady as isCvReady,
  emptyStageCounts,
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
 * PAGED AND SEARCHED ON THE SERVER (audit M08, 2026-09-15). This screen used to
 * download every job with every CV snapshot, letter, Q&A set and interview
 * transcript, then filter in the browser — heavier with every job saved, and on
 * a phone that is the whole problem. It now asks for one page of lightweight
 * summaries (GET /api/packages?view=summary, migration 055). Search and the
 * stage filter run in the database, so a search finds an older job that is not
 * on the page yet; "Load more" reaches the rest. The stage strip's counts come
 * from the server and cover every job.
 *
 * SAVED IS NOT APPLIED (audit M07). A new job starts as "Saved · not applied";
 * the user moves it on. Preparation progress (CV, letter, Q&A, mock) is shown
 * separately from the application stage.
 *
 * STATUS (PUT), RENAME (PATCH) and DELETE keep their optimistic-then-reconciled
 * behaviour.
 */

const PAGE_SIZE = 20
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS[d.getMonth()] ?? ''}`
}

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

/**
 * The job's own name, edited where it is read. Falls back to
 * `target_job_title` for display, and saves an EMPTY name when the text is left
 * equal to that title — so "never renamed" is still stored as NULL. Saves on
 * blur or Enter only when the value changed; Escape restores it.
 */
function NameField({
  value,
  fallback,
  onSave,
}: {
  value: string
  fallback: string
  onSave: (next: string) => void
}) {
  const shown = value || fallback
  const [draft, setDraft] = useState(shown)
  useEffect(() => setDraft(value || fallback), [value, fallback])

  const commit = (raw: string) => {
    const next = raw.trim()
    if (next === shown.trim()) return
    onSave(next === fallback.trim() ? '' : next)
  }

  return (
    <input
      type="text"
      value={draft}
      placeholder={fallback}
      maxLength={120}
      aria-label="Job name"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setDraft(shown)
          e.currentTarget.blur()
        }
      }}
      // 44px tall — the one control on the card with no visible edge until touched.
      className="min-h-11 w-full rounded-ctl border border-transparent bg-transparent px-1.5 py-2 font-display text-[15px] font-bold leading-snug tracking-[-0.01em] text-ink hover:border-line focus:border-teal focus:bg-white focus-visible:outline-none"
    />
  )
}

/** What this job already has. A dashed chip is an invitation to make it. */
function ArtifactChip({ label, present }: { label: string; present: boolean }) {
  return (
    <span
      className={cn(
        'rounded-[4px] px-2 py-1 text-[12px] font-semibold leading-none',
        present
          ? 'bg-teal-soft text-teal'
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
  return <span className="block truncate text-[13px] font-medium text-ink-soft">{parts.join(' · ')}</span>
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
  onRename: (next: string) => void
  onStage: (next: PackageStatus) => void
  onDelete: () => void
}) {
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
    pkg.application_deadline ? `Deadline ${formatDay(pkg.application_deadline)}` : null,
    pkg.interview_date ? `Interview ${formatDay(pkg.interview_date)}` : null,
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
    { label: 'CV', done: cvReady, href: `/package/${id}` },
    { label: 'Letter', done: letterPresent, href: `/cover-letter?package=${id}` },
    { label: 'Q&A', done: qaIsReady, href: `/interview-qa?package=${id}` },
    { label: 'Mock', done: mockIsDone, href: `/mock-interview?package=${id}` },
  ]
  const displayName = (pkg.name ?? '').trim() || pkg.target_job_title

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-card border border-line bg-white p-4 shadow-m-1 transition-shadow hover:shadow-m-2 sm:p-5">
      {/* Who and where — the title opens this job's workspace. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href={`/package/${id}`}
            className="block break-words rounded-ctl font-display text-[17px] font-semibold leading-snug text-ink underline-offset-4 hover:text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            {displayName}
          </Link>
          <div className="mt-0.5 min-w-0">
            <JobSubtitle pkg={pkg} />
          </div>
          {/* What tells two jobs with the same title apart. */}
          <p className="mt-1 text-[12px] text-ink-muted">
            {levelLabel(pkg.optimization_level)} optimization · added {formatDay(pkg.created_at)}
            {pkg.updated_at && pkg.updated_at.slice(0, 10) !== pkg.created_at.slice(0, 10) ? ` · updated ${formatDay(pkg.updated_at)}` : ''}
          </p>
        </div>
        <StageSelect value={pkg.status} onChange={onStage} className="self-start" />
      </div>

      {/* Preparation for this job: four steps, each one tap away. */}
      <ol aria-label={`Preparation: ${readyCount} of ${totalCount} ready`} className="grid grid-cols-4 gap-1.5">
        {steps.map((st) => (
          <li key={st.label} className="min-w-0">
            <Link
              href={st.href}
              className={cn(
                'flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-ctl border px-1 py-1.5 text-center text-[12px] font-semibold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
                st.done ? 'border-ok/30 bg-ok-soft text-ok' : 'border-dashed border-line-strong bg-canvas text-ink-muted hover:border-teal/50',
              )}
            >
              <span aria-hidden="true">{st.done ? '✓' : '○'}</span>
              <span className="truncate">{st.label}</span>
              <span className="sr-only">{st.done ? 'ready' : 'not yet'}</span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        {next ? (
          <Link href={next.href} className={cn(buttonVariants({ variant: 'progress', size: 'sm' }), 'w-full sm:w-auto')}>
            Next: {next.label}
          </Link>
        ) : (
          <span className="w-full rounded-ctl bg-ok-soft px-3 py-2.5 text-center text-[13px] font-semibold text-ok sm:w-auto sm:text-left">
            Ready to apply — every step done
          </span>
        )}
        <Link href={`/package/${id}`} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'flex-1 sm:flex-none')}>
          Open workspace
        </Link>
        <button
          type="button"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((v) => !v)}
          className="min-h-11 px-2 text-[13px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:ml-auto"
        >
          {detailsOpen ? 'Hide details' : 'Details'}
        </button>
      </div>

      {detailsOpen ? (
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-ink-muted">Name in your library (to tell versions apart)</span>
            <NameField value={pkg.name ?? ''} fallback={pkg.target_job_title} onSave={onRename} />
          </label>
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
                <span key={item} className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[12px] font-semibold text-ink-soft">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          <div>
            <button
              type="button"
              aria-expanded={targetOpen}
              onClick={toggleTarget}
              className="min-h-11 text-[13px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              {targetOpen ? 'Hide target job' : `${CTA.viewTargetJob} and ATS score`}
            </button>
            {targetOpen ? (
              detail ? (
                <TargetJobCard pkg={detail} className="mt-1 shadow-none" />
              ) : detailState === 'error' ? (
                <p className="text-[12.5px] text-alert">Could not load this target job. Try again.</p>
              ) : (
                <p className="text-[12.5px] text-ink-muted" role="status">Loading target job…</p>
              )
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cvReady ? (
              <Link href={`/package/${id}/edit`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                {CTA.editCv}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onDelete}
              aria-pressed={confirmingDelete}
              className={cn(buttonVariants({ variant: confirmingDelete ? 'danger-solid' : 'danger', size: 'sm' }))}
            >
              {confirmingDelete ? 'Confirm: delete this job and its documents' : 'Delete'}
            </button>
          </div>
          <p className="text-[12px] text-ink-muted">{templateNameFor(pkg.template_id)} template</p>
        </div>
      ) : null}
    </article>
  )
}

export default function TargetJobsPage() {
  const { usage } = useServiceUsage()
  const [items, setItems] = useState<PackageSummary[] | null>(null)
  const [cursor, setCursor] = useState<PackageListPage['next_cursor']>(null)
  const [counts, setCounts] = useState<Record<PackageStatus, number>>(emptyStageCounts())
  const [total, setTotal] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [opError, setOpError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<PackageStatus | null>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [searching, setSearching] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const requestSeq = useRef(0)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(t)
  }, [query])

  // First page (and counts) whenever the search or stage changes. A reply that
  // arrives after a newer request has started is dropped.
  useEffect(() => {
    const seq = ++requestSeq.current
    setSearching(true)
    setLoadError(null)
    const qs = new URLSearchParams({ view: 'summary', limit: String(PAGE_SIZE), counts: '1' })
    if (debouncedQuery) qs.set('q', debouncedQuery)
    if (stageFilter) qs.set('stage', stageFilter)
    fetch(`/api/packages?${qs.toString()}`, { cache: 'no-store' })
      .then((res) => {
        if (res.ok) return res.json() as Promise<PackageListPage>
        throw new Error(String(res.status))
      })
      .then((data) => {
        if (seq !== requestSeq.current) return
        setItems(data.packages ?? [])
        setCursor(data.next_cursor)
        if (data.counts) setCounts(data.counts)
        if (typeof data.total === 'number') setTotal(data.total)
      })
      .catch(() => {
        if (seq === requestSeq.current) setLoadError('Could not load your Resume Library. Check your connection and try again.')
      })
      .finally(() => {
        if (seq === requestSeq.current) setSearching(false)
      })
  }, [debouncedQuery, stageFilter, reloadKey])

  async function loadMore() {
    if (!cursor || loadingMore) return
    const seq = requestSeq.current
    setLoadingMore(true)
    setOpError(null)
    const qs = new URLSearchParams({ view: 'summary', limit: String(PAGE_SIZE), before: cursor.before, before_id: cursor.before_id })
    if (debouncedQuery) qs.set('q', debouncedQuery)
    if (stageFilter) qs.set('stage', stageFilter)
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
        setCounts((c) => ({ ...c, [from]: Math.max(0, c[from] - 1), [to]: c[to] + 1 }))
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
      const prevName = items?.find((p) => p.id === id)?.name ?? null
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
          setOpError((body?.error as string) ?? 'Could not rename this job.')
        }
      } catch {
        setItems((list) => (list ? list.map((p) => (p.id === id ? { ...p, name: prevName } : p)) : list))
        setOpError('Network error. Could not rename this job.')
      }
    },
    [items]
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
        const gone = list?.find((p) => p.id === id)
        if (gone) setCounts((c) => ({ ...c, [gone.status]: Math.max(0, c[gone.status] - 1) }))
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
  const filtering = Boolean(debouncedQuery) || stageFilter !== null

  return (
    // The shared page frame (2026-09-23): the Library was the one list screen
    // drawing its own header, at its own size and padding.
    <PageShell
      width="document"
      icon={BriefcaseIcon}
      title="Resume Library"
      subtitle="Every job you are targeting, with its CV, cover letter, interview preparation and application stage."
      actions={
        total > 0 ? (
          <Link href="/optimize/target" className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'shrink-0')}>
            {CTA.addTargetJob}
          </Link>
        ) : null
      }
    >

      {/* ONE TOOLBAR (2026-09-24 simplification): search and stage side by
          side. It was a search card, a four-tile usage block and a ten-column
          stage strip — three panels before the first job on a phone. */}
      {total > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="sr-only">Search your jobs</span>
            <input
              id="library-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search role, company, country or name"
              className="field w-full"
              maxLength={100}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:w-[240px]">
            <span className="sr-only">Filter by stage</span>
            <select
              value={stageFilter ?? ''}
              onChange={(e) => setStageFilter(e.target.value ? (e.target.value as PackageStatus) : null)}
              className="field"
            >
              <option value="">All stages ({total})</option>
              {PACKAGE_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label} ({counts[st.value as PackageStatus] ?? 0})
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      {total > 0 ? (
        <p className="-mt-2 text-[12.5px] text-ink-muted" role="status" aria-live="polite">
          {searching
            ? 'Searching all your jobs…'
            : filtering
              ? `${list.length}${cursor ? '+' : ''} matching ${list.length === 1 && !cursor ? 'job' : 'jobs'} of ${total}.`
              : `${total} ${total === 1 ? 'job' : 'jobs'}.`}
        </p>
      ) : null}

      {opError ? <Alert variant="danger">{opError}</Alert> : null}
      {loadError && items !== null ? <Alert variant="danger">{loadError}</Alert> : null}

      {total === 0 && !filtering ? (
        <EmptyState
          icon={BriefcaseIcon}
          title="Your targeted resumes will appear here"
          body="Add the job you are applying for and we build a CV for it from your Career Profile. Its cover letter and interview preparation stay with it."
          action={
            <Link href="/optimize/target" className={buttonVariants({ variant: 'primary' })}>
              {CTA.addTargetJob}
            </Link>
          }
        />
      ) : null}

      {total > 0 && list.length === 0 && !searching ? (
        <div className="rounded-card border border-line bg-white px-5 py-8 text-center">
          <p className="text-[14px] text-ink-soft">
            No jobs match these filters.{' '}
            <button
              type="button"
              onClick={() => { setStageFilter(null); setQuery('') }}
              className="font-semibold text-teal underline underline-offset-2"
            >
              Show all
            </button>
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {list.map((pkg) => (
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
