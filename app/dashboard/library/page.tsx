'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/Button'
import { CTA } from '@/lib/serviceLabels'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
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
  if (parts.length === 0) {
    return <span className="text-[13px] text-ink-muted">Added {formatDay(pkg.created_at)}</span>
  }
  return <span className="block truncate text-[13px] font-medium text-ink-soft">{parts.join(' · ')}</span>
}

function ApplicationCard({
  pkg,
  confirmingDelete,
  onRename,
  onStage,
  onDelete,
}: {
  pkg: PackageSummary
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
  const progress = Math.round((readyCount / totalCount) * 100)
  // The saved target job (title, job description, ATS score) is loaded only
  // when the user opens it: list summaries stay light (audit M08).
  const [targetOpen, setTargetOpen] = useState(false)
  const [detail, setDetail] = useState<Package | null>(null)
  const [detailState, setDetailState] = useState<'idle' | 'loading' | 'error'>('idle')
  const toggleTarget = () => {
    const next = !targetOpen
    setTargetOpen(next)
    if (next && !detail && detailState !== 'loading') {
      setDetailState('loading')
      fetch(`/api/packages/${encodeURIComponent(pkg.id)}`, { cache: 'no-store' })
        .then((res) => (res.ok ? (res.json() as Promise<Package>) : Promise.reject(new Error(String(res.status)))))
        .then((data) => {
          setDetail(data)
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

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-card border border-line bg-white p-4 shadow-m-1 transition-shadow hover:shadow-m-2 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <NameField value={pkg.name ?? ''} fallback={pkg.target_job_title} onSave={onRename} />
          <div className="min-w-0 px-1.5">
            <JobSubtitle pkg={pkg} />
          </div>
        </div>
        <StageSelect value={pkg.status} onChange={onStage} className="self-start" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ArtifactChip label={cvReady ? 'CV ready' : 'CV not built'} present={cvReady} />
        <ArtifactChip label={letterPresent ? 'Letter ready' : 'Letter needed'} present={letterPresent} />
        <ArtifactChip label={qaIsReady ? 'Q&A ready' : 'Q&A needed'} present={qaIsReady} />
        <ArtifactChip label={mockIsDone ? 'Mock done' : 'Mock needed'} present={mockIsDone} />
      </div>

      <div className="rounded-ctl bg-canvas px-3 py-2">
        <div className="flex items-center justify-between gap-3 text-[12px] font-semibold text-ink-muted">
          <span>Preparation</span>
          <span>{readyCount}/{totalCount} ready</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Preparation progress" aria-valuemin={0} aria-valuemax={totalCount} aria-valuenow={readyCount}>
          <span className="block h-full rounded-full bg-teal" style={{ width: `${progress}%` }} />
        </div>
      </div>

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
        <Link
          href={`/package/${pkg.id}`}
          className={cn(buttonVariants({ variant: cvReady ? 'progress' : 'primary', size: 'sm' }), 'flex-1 sm:flex-none')}
        >
          {cvReady ? CTA.viewOptimizedCv : CTA.optimizeCv}
        </Link>
        {cvReady ? <Link href={`/package/${pkg.id}/edit`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
          {CTA.editCv}
        </Link> : null}
        <button
          type="button"
          onClick={onDelete}
          aria-pressed={confirmingDelete}
          className={cn(buttonVariants({ variant: confirmingDelete ? 'danger-solid' : 'danger', size: 'sm' }))}
        >
          {confirmingDelete ? 'Confirm delete' : 'Delete'}
        </button>
      </div>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-3 text-[12px] text-ink-muted">
        <span>{templateNameFor(pkg.template_id)} template</span>
        <span aria-hidden>·</span>
        <span>{levelLabel(pkg.optimization_level)} optimization</span>
        <span aria-hidden>·</span>
        <span>Updated {formatDay(pkg.updated_at ?? pkg.created_at)}</span>
      </p>
    </article>
  )
}

export default function TargetJobsPage() {
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
    <div className="flex min-h-screen flex-col gap-5 bg-canvas p-5 font-redesign-sans sm:p-8 lg:p-10">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-[27px] font-bold leading-tight tracking-[-0.02em] text-ink">
            Resume Library
          </h1>
          <p className="text-[13px] text-ink-soft">
            Your saved target jobs, their preparation and where each application stands. Saving a job does not mark it as applied.
          </p>
        </div>
        {total > 0 ? (
          <Link href="/optimize/target" className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'shrink-0')}>
            {CTA.addTargetJob}
          </Link>
        ) : null}
      </div>

      {total > 0 ? (
        <div className="rounded-card border border-line bg-white p-4">
          <label htmlFor="library-search" className="mb-2 block text-sm font-semibold text-ink">Find a saved job</label>
          <input
            id="library-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search role, company, country or name"
            className="field w-full"
            maxLength={100}
          />
          <p className="mt-2 text-xs text-ink-muted" role="status" aria-live="polite">
            {searching
              ? 'Searching all your jobs…'
              : filtering
                ? `${list.length}${cursor ? '+' : ''} matching ${list.length === 1 && !cursor ? 'job' : 'jobs'} across all ${total}.`
                : `${list.length} of ${total} jobs shown.`}
          </p>
        </div>
      ) : null}

      {opError ? <Alert variant="danger">{opError}</Alert> : null}
      {loadError && items !== null ? <Alert variant="danger">{loadError}</Alert> : null}

      {/* ── Stage strip ── counts are the server's, across every job. */}
      {total > 0 ? (
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <div className="flex min-w-max items-stretch divide-x divide-line border-y border-line bg-white">
            <button
              type="button"
              onClick={() => setStageFilter(null)}
              aria-pressed={stageFilter === null}
              className={cn(
                'flex min-h-11 min-w-[86px] flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal',
                stageFilter === null && 'bg-canvas'
              )}
            >
              <span className="font-mono text-[17px] font-semibold leading-none text-ink">{total}</span>
              <span className="text-[12px] font-medium text-ink-muted">All</span>
            </button>
            {PACKAGE_STATUSES.map((s) => {
              const active = stageFilter === s.value
              const count = counts[s.value as PackageStatus] ?? 0
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStageFilter(active ? null : (s.value as PackageStatus))}
                  aria-pressed={active}
                  className={cn(
                    'flex min-h-11 min-w-[86px] flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal',
                    active && 'bg-canvas'
                  )}
                >
                  <span className={cn('font-mono text-[17px] font-semibold leading-none', count > 0 ? 'text-ink' : 'text-ink-muted')}>
                    {count}
                  </span>
                  <span className="whitespace-nowrap text-[12px] font-medium text-ink-muted">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {total === 0 && !filtering ? (
        <EmptyState
          title="No target jobs yet"
          body="Add the role you are applying for and we build a CV against it. Everything you do for that job stays with it."
          action={
            <Link href="/optimize/target" className={buttonVariants({ variant: 'primary' })}>
              {CTA.addTargetJob}
            </Link>
          }
        />
      ) : null}

      {total > 0 && list.length === 0 && !searching ? (
        <div className="border border-line bg-white px-5 py-8 text-center">
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
    </div>
  )
}
