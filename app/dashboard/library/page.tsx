'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn, GULF_COUNTRIES, PACKAGE_STATUSES } from '@/lib/utils'
import { StageSelect } from '@/components/package/StageSelect'
import { getTemplate } from '@/lib/templates'
import type { Package, PackageStatus } from '@/types/package'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'

/**
 * Resume Library — route /dashboard/library.
 *
 * NAMED "TARGET JOBS" 2026-09-09 → 2026-09-11, then "Resume Library" again by
 * founder decision. Only the name went back; the job-first rows below stayed,
 * and the reasoning for them is unchanged.
 *
 * A `packages` row has always held a job title, a country, a company, the
 * pasted advert, the CV built for it, its cover letters, and a status running
 * applied → shortlisted → interview → visa_processing → offer. That is an
 * application, and the status dropdown means users have been tracking real
 * applications here since migration 012. The product called it a Library and
 * drew it as a list of files, so the row's identity was the DOCUMENT and the
 * job it was for appeared, if at all, as a placeholder in a rename field.
 *
 * This screen inverts that: the row is the JOB — role, employer, country,
 * stage — and the CV and letters are things that job has. Same table, same
 * columns, same three endpoints. Nothing was added to the schema and no new
 * call is made; every field shown below was already in the `select('*')` this
 * page has always fetched.
 *
 * COMPANY AND COUNTRY ARE BACK, CONDITIONALLY. TASK-157 removed them because
 * they rendered "No company · Not specified" on essentially every row — true
 * then, and the right call for a subtitle that always printed. Here they are
 * the row's identity, so they render only when the user actually supplied
 * them and the line simply gets shorter when they did not. `generic_gulf` is
 * treated as unspecified on purpose: "Generic Gulf" is our enum, not a place
 * anyone is moving to.
 *
 * THE STAGE STRIP filters in the browser over the array already in state. It
 * is not a query, and it deliberately shows a stage with a count of zero —
 * seeing "Interview 0" is what makes the pipeline legible.
 *
 * STATUS (PUT /api/packages/[id]), RENAME (PATCH) and DELETE are unchanged,
 * including their optimistic-then-reconciled behaviour.
 */

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
 * Where this job is, in words a user would use.
 *
 * `generic_gulf` returns null: it is the value the form stores when somebody
 * has not chosen a country, and printing "Generic Gulf" on their application
 * would be showing them our database rather than their job.
 */
function countryLabel(value: string | null): string | null {
  if (!value || value === 'generic_gulf') return null
  return GULF_COUNTRIES.find((c) => c.value === value)?.label ?? null
}

function templateNameFor(id?: string | null): string {
  return getTemplate(id).name
}

/**
 * The job's own name, edited where it is read.
 *
 * IT SHOWS THE TITLE AS A REAL VALUE, not as a placeholder. When this list was
 * a document library the row's identity was the file, and an unnamed row could
 * sensibly show its target job title in placeholder grey. Now the row IS the
 * job, so the title is the headline — and a placeholder is the wrong element
 * for a headline twice over: it renders at placeholder contrast, and it is not
 * content, so it is absent from the accessibility tree and from anything that
 * reads the page as text.
 *
 * `name` stays nullable and nothing about storage changed. The field simply
 * falls back to `target_job_title` for display, and saves an EMPTY name when
 * the text is left equal to that title — so "never renamed" is still stored as
 * NULL rather than as a copy of the job title.
 *
 * Saves on blur or Enter and only when the value actually changed, so moving
 * through the list with the keyboard never fires a write. Escape abandons the
 * edit and restores what was there.
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
    // Typing the target job title back in means "no custom name", not "name it
    // the same as the title" — otherwise the fallback would quietly become a
    // stored duplicate that no longer tracks the job.
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
      // 44px tall — it measured 30px, the smallest tap target on the page, and
      // it is the one control on the card with no visible edge until touched.
      className="min-h-11 w-full rounded-ctl border border-transparent bg-transparent px-1.5 py-2 font-display text-[15px] font-bold leading-snug tracking-[-0.01em] text-ink hover:border-line focus:border-teal focus:bg-white focus-visible:outline-none"
    />
  )
}

/**
 * What this job already has.
 *
 * A dashed chip says "not made yet" and is therefore an invitation, so it may
 * only appear for something the user can actually go and make. CV and cover
 * letter qualify. The Q&A chip was dropped on 2026-08-19 for exactly this
 * reason and stays gone until Interview Prep exists.
 */
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
function JobSubtitle({ pkg }: { pkg: Package }) {
  const parts = [pkg.target_company, countryLabel(pkg.target_country)].filter(Boolean) as string[]
  if (parts.length === 0) {
    return <span className="text-[13px] text-ink-muted">Added {formatDay(pkg.created_at)}</span>
  }
  return <span className="truncate text-[13px] font-medium text-ink-soft">{parts.join(' · ')}</span>
}

export default function TargetJobsPage() {
  const [packages, setPackages] = useState<Package[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [opError, setOpError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<PackageStatus | null>(null)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    fetch('/api/packages', { cache: 'no-store' })
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error(String(res.status))
      })
      .then((data) => setPackages((data?.packages as Package[] | undefined) ?? []))
      .catch(() => setLoadError('Could not load your Resume Library. Please try again.'))
  }, [])

  const changeStatus = useCallback(
    async (id: string, next: PackageStatus) => {
      if (!packages) return
      setOpError(null)
      const prev = packages.find((p) => p.id === id)
      if (!prev || prev.status === next) return
      // Optimistic update, then reconcile on failure.
      setPackages((prevList) =>
        prevList ? prevList.map((p) => (p.id === id ? { ...p, status: next } : p)) : prevList
      )
      const revert = () => {
        setPackages((prevList) =>
          prevList ? prevList.map((p) => (p.id === id ? { ...p, status: prev.status } : p)) : prevList
        )
      }
      try {
        const res = await fetch(`/api/packages/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          revert()
          setOpError((body?.error as string) ?? 'Could not update the stage.')
        }
      } catch {
        revert()
        setOpError('Network error. Could not update the stage.')
      }
    },
    [packages]
  )

  const renamePackage = useCallback(
    async (id: string, next: string) => {
      setOpError(null)
      // Optimistic, then reconciled — same pattern as the stage control above.
      const prevName = packages?.find((p) => p.id === id)?.name ?? null
      setPackages((list) => (list ? list.map((p) => (p.id === id ? { ...p, name: next || null } : p)) : list))
      try {
        const res = await fetch(`/api/packages/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: next }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setPackages((list) => (list ? list.map((p) => (p.id === id ? { ...p, name: prevName } : p)) : list))
          setOpError((body?.error as string) ?? 'Could not rename this job.')
        }
      } catch {
        setPackages((list) => (list ? list.map((p) => (p.id === id ? { ...p, name: prevName } : p)) : list))
        setOpError('Network error. Could not rename this job.')
      }
    },
    [packages]
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
      setPackages((prevList) => (prevList ? prevList.filter((p) => p.id !== id) : prevList))
      setConfirmingDelete(null)
    } catch {
      setOpError('Network error. Could not delete this job.')
      setConfirmingDelete(null)
    }
  }, [])

  // Counts across every stage, including the empty ones — an interview column
  // reading 0 is information, and hiding it would flatter the pipeline.
  const stageCounts = useMemo(() => {
    const counts: Record<PackageStatus, number> = {
      applied: 0,
      shortlisted: 0,
      interview: 0,
      visa_processing: 0,
      offer: 0,
    }
    for (const p of packages ?? []) counts[p.status] += 1
    return counts
  }, [packages])

  const visible = useMemo(
    () => (packages ?? []).filter((p) => (stageFilter ? p.status === stageFilter : true)),
    [packages, stageFilter]
  )

  if (packages === null) {
    return (
      // The shape of what is coming. A centred "Loading…" told the user
      // nothing and let the layout jump when the rows arrived.
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

  if (loadError) {
    return (
      <div className="flex items-center justify-center px-5 py-20">
        <Alert variant="danger">{loadError}</Alert>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-canvas p-5 font-redesign-sans sm:p-8 lg:p-10">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-[27px] font-bold leading-tight tracking-[-0.02em] text-ink">
            Resume Library
          </h1>
          <p className="text-[13px] text-ink-soft">
            Every role you are going for, with its CV and where it stands.
          </p>
        </div>
        {packages.length > 0 ? (
          <Link
            href="/optimize/target"
            className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'shrink-0')}
          >
            Add a target job
          </Link>
        ) : null}
      </div>

      {opError ? <Alert variant="danger">{opError}</Alert> : null}

      {/* ── Stage strip ──
          Client-side filtering over the array already in state. A button with
          `aria-pressed` rather than a link, because nothing about the URL
          changes and the back button should not walk through filters. */}
      {packages.length > 0 ? (
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <div className="flex min-w-max items-stretch divide-x divide-line border-y border-line bg-white">
            <button
              type="button"
              onClick={() => setStageFilter(null)}
              aria-pressed={stageFilter === null}
              className={cn(
                'flex min-w-[86px] flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal',
                stageFilter === null && 'bg-canvas'
              )}
            >
              <span className="font-mono text-[17px] font-semibold leading-none text-ink">
                {packages.length}
              </span>
              <span className="text-[12px] font-medium text-ink-muted">All</span>
            </button>
            {PACKAGE_STATUSES.map((s) => {
              const active = stageFilter === s.value
              const count = stageCounts[s.value]
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStageFilter(active ? null : (s.value as PackageStatus))}
                  aria-pressed={active}
                  className={cn(
                    'flex min-w-[86px] flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal',
                    active && 'bg-canvas'
                  )}
                >
                  <span
                    className={cn(
                      'font-mono text-[17px] font-semibold leading-none',
                      count > 0 ? 'text-ink' : 'text-ink-muted'
                    )}
                  >
                    {count}
                  </span>
                  <span className="text-[12px] font-medium text-ink-muted">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {packages.length === 0 ? (
        <EmptyState
          title="No target jobs yet"
          body="Add the role you are applying for and we build a CV against it. Everything you do for that job stays with it."
          action={
            <Link href="/optimize/target" className={buttonVariants({ variant: 'primary' })}>
              Add your first target job
            </Link>
          }
        />
      ) : null}

      {packages.length > 0 && visible.length === 0 ? (
        <div className="border border-line bg-white px-5 py-8 text-center">
          <p className="text-[14px] text-ink-soft">
            Nothing at this stage yet.{' '}
            <button
              type="button"
              onClick={() => setStageFilter(null)}
              className="font-semibold text-teal underline underline-offset-2"
            >
              Show all
            </button>
          </p>
        </div>
      ) : null}

      {/* ── MOBILE: cards ── */}
      <div className="grid gap-3 lg:hidden">
        {visible.map((pkg) => {
          const letterPresent = Array.isArray(pkg.cover_letters) && pkg.cover_letters.length > 0
          // "CV ✓" was hard-coded, so a job set up but never built claimed a CV
          // it did not have. A CV exists when the generated content does.
          const cvReady = pkg.optimized_content != null
          return (
            <div key={pkg.id} className="border border-line bg-white p-4">
              {/* THE TITLE GETS THE FULL WIDTH ON A PHONE.
                  The stage control was a sibling of the title, and a native
                  <select> sizes itself to its LONGEST option — "Visa
                  processing" — so it claimed about 140px of a 375px screen
                  whatever stage the job was actually at. That truncated the
                  role to "Senior Piping E…": the row's own identity cut short
                  to make room for a control. It drops to the row below, beside
                  the chips, which is dead space anyway. */}
              <div className="flex min-w-0 flex-col gap-1">
                {/* The row's identity is the job. Editable in place, with the
                    target job title as the fallback, so an unnamed job reads
                    exactly as it always did. */}
                <NameField
                  value={pkg.name ?? ''}
                  fallback={pkg.target_job_title}
                  onSave={(next) => renamePackage(pkg.id, next)}
                />
                <div className="px-1.5">
                  <JobSubtitle pkg={pkg} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StageSelect value={pkg.status} onChange={(s) => changeStatus(pkg.id, s)} />
                {/* No "ATS —" chip: the ATS score was withdrawn with Job
                    Match on 2026-09-04, so every row showed a dash for a
                    service the user cannot get. */}
                <ArtifactChip label={cvReady ? 'CV ✓' : 'CV not built'} present={cvReady} />
                <ArtifactChip label={letterPresent ? 'Letter ✓' : 'Letter —'} present={letterPresent} />
              </div>

              {/* Three real buttons. "Edit" and "Delete" were bare words at
                  different baselines, and Delete was plain black — the one
                  action that cannot be undone looked like the safest. */}
              <div className="mt-3.5 flex items-center gap-2">
                <Link
                  href={`/package/${pkg.id}`}
                  className={cn(buttonVariants({ variant: 'progress', size: 'sm' }), 'flex-1')}
                >
                  {cvReady ? 'Open CV' : 'Continue'}
                </Link>
                <Link href={`/package/${pkg.id}/edit`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    confirmingDelete === pkg.id ? deletePackage(pkg.id) : setConfirmingDelete(pkg.id)
                  }
                  aria-pressed={confirmingDelete === pkg.id}
                  className={cn(
                    buttonVariants({ variant: confirmingDelete === pkg.id ? 'danger-solid' : 'danger', size: 'sm' }),
                  )}
                >
                  {confirmingDelete === pkg.id ? 'Confirm delete' : 'Delete'}
                </button>
              </div>

              {/* Template and date only. The row used to lead this line with
                  "ID e5c09197" and "Moderate optimization" — our database key
                  and our internal setting, neither of which the user chose or
                  can act on. */}
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-2.5 text-[12px] text-ink-muted">
                <span>{templateNameFor(pkg.template_id)} template</span>
                <span aria-hidden>·</span>
                <span>Updated {formatDay(pkg.updated_at ?? pkg.created_at)}</span>
              </p>
            </div>
          )
        })}
      </div>

      {/* ── DESKTOP: table ──
          Job / Employer / Stage / Documents / Actions. Rename and delete are
          present here as well as on mobile — both were desktop-unreachable
          until 2026-08-19, and a hard delete with no desktop entry point meant
          rows a desktop user had no way to remove. */}
      <div className="hidden overflow-hidden border border-line bg-white lg:block">
        <div className="grid grid-cols-[2.2fr_1.4fr_1.1fr_1fr_170px] gap-4 border-b border-line bg-canvas px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
          <span>Job</span>
          <span>Employer</span>
          <span>Stage</span>
          <span>Documents</span>
          <span className="text-right">Actions</span>
        </div>
        {visible.map((pkg) => {
          const letterPresent = Array.isArray(pkg.cover_letters) && pkg.cover_letters.length > 0
          const cvReady = pkg.optimized_content != null
          return (
            <div
              key={pkg.id}
              className="grid grid-cols-[2.2fr_1.4fr_1.1fr_1fr_170px] items-center gap-4 border-b border-line px-5 py-3.5 last:border-0"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                {/* Same handler as the mobile card, so the two views cannot
                    drift apart in behaviour. */}
                <NameField
                  value={pkg.name ?? ''}
                  fallback={pkg.target_job_title}
                  onSave={(next) => renamePackage(pkg.id, next)}
                />
                <span className="px-1.5 text-[12px] text-ink-muted">{templateNameFor(pkg.template_id)} template</span>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <JobSubtitle pkg={pkg} />
                <span className="text-[12px] text-ink-muted">Added {formatDay(pkg.created_at)}</span>
              </div>
              <div className="justify-self-start">
                <StageSelect value={pkg.status} onChange={(s) => changeStatus(pkg.id, s)} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <ArtifactChip label={cvReady ? 'CV ✓' : 'CV not built'} present={cvReady} />
                <ArtifactChip label={letterPresent ? 'Letter ✓' : 'Letter —'} present={letterPresent} />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Link
                  href={`/package/${pkg.id}`}
                  className="inline-flex min-h-9 items-center justify-center rounded-ctl bg-teal px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    confirmingDelete === pkg.id ? deletePackage(pkg.id) : setConfirmingDelete(pkg.id)
                  }
                  aria-pressed={confirmingDelete === pkg.id}
                  title="Delete this target job"
                  className={cn(
                    'min-h-9 rounded-ctl px-2 text-[12px] font-semibold text-ink-muted transition-colors hover:bg-alert-soft hover:text-alert focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert',
                    confirmingDelete === pkg.id && 'bg-alert-soft text-alert'
                  )}
                >
                  {confirmingDelete === pkg.id ? 'Confirm?' : 'Delete'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
