'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn, GULF_COUNTRIES, PACKAGE_STATUSES } from '@/lib/utils'
import type { Package, PackageStatus } from '@/types/package'

/**
 * Library — screen 11 (TASK-035), route /dashboard/library.
 *
 * Lists the caller's packages (from GET /api/packages, scoped to user_id).
 * Mobile: cards (target title, "company · country · date", status dropdown,
 * artifact chips, Open / Re-optimize / Delete). Desktop (lg+): a table with the
 * same data model — Target / Country / Level / Status (inline dropdown) / Open.
 *
 * STATUS dropdown (PUT /api/packages/[id]): writes packages.status
 * (applied / shortlisted / interview / visa_processing / offer), optimistic then
 * reconciled — reverts on error. DELETE is a hard delete of the package row
 * (DELETE /api/packages/[id]) behind a two-step inline confirm.
 *
 * ARTIFACT CHIPS read the Phase 2–4 schema-reservation slots (§2): CV ✓ is the
 * resume itself (always present); ATS / Letter / Q&A are dashed when their
 * corresponding jsonb column is null, filled when populated (all null today —
 * Phases 2–4 not built). Re-optimize routes to /optimize/target (the natural
 * entry to start again; full reuse-detection / overwrite flow is TASK-036).
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS[d.getMonth()] ?? ''}`
}

function countryLabel(c: string | null): string {
  if (!c) return 'Not specified'
  return GULF_COUNTRIES.find((x) => x.value === c)?.label ?? c
}

function levelLabel(level: string): string {
  return level.charAt(0).toUpperCase() + level.slice(1)
}

// Status dropdown styling mirrors Pill's status variant colours (never hard hex).
function statusSelectClass(status: PackageStatus): string {
  const map: Record<PackageStatus, string> = {
    applied: 'border-line-dark-strong bg-surface-2-dark text-ink-700-dark',
    shortlisted: 'border-redesign-gold-dark/50 bg-redesign-gold-tint-dark text-gold-text-dark',
    interview: 'border-forest-dark/50 bg-forest-tint-dark text-forest-dark',
    visa_processing: 'border-line-dark bg-surface-2-dark text-ink-400-dark',
    offer: 'border-forest-dark bg-forest text-ink-900-dark',
  }
  return map[status]
}

function ArtifactChip({ label, present }: { label: string; present: boolean }) {
  return (
    <span
      className={cn(
        'rounded-[6px] px-2 py-1 text-[9.5px] font-semibold leading-none',
        present
          ? 'bg-forest-tint-dark text-forest-dark'
          : 'border border-dashed border-line-dark-strong bg-surface-2-dark text-ink-400-dark'
      )}
    >
      {label}
    </span>
  )
}

// The status "pill" is a native <select> styled per status variant. The parent
// owns optimistic updates + revert on error; this just reports the new value.
function StatusSelect({
  initial,
  onChange,
}: {
  initial: PackageStatus
  onChange: (s: PackageStatus) => void
}) {
  return (
    <select
      value={initial}
      onChange={(e) => {
        const next = e.target.value as PackageStatus
        if (next !== initial) onChange(next)
      }}
      aria-label="Package status"
      className={cn(
        'min-h-11 cursor-pointer rounded-full border px-[11px] py-[6px] text-[11px] font-semibold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold-dark focus-visible:ring-offset-2',
        statusSelectClass(initial)
      )}
    >
      {PACKAGE_STATUSES.map((s) => (
        <option key={s.value} value={s.value} className="bg-surface-dark text-ink-700-dark">
          {s.label} ▾
        </option>
      ))}
    </select>
  )
}

export default function DashboardLibraryPage() {
  const [packages, setPackages] = useState<Package[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [opError, setOpError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
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
      .catch(() => setLoadError('Could not load your Library. Please try again.'))
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
          setOpError((body?.error as string) ?? 'Could not update status.')
        }
      } catch {
        revert()
        setOpError('Network error. Could not update status.')
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
        setOpError((body?.error as string) ?? 'Could not delete this package.')
        setConfirmingDelete(null)
        return
      }
      setPackages((prevList) => (prevList ? prevList.filter((p) => p.id !== id) : prevList))
      setConfirmingDelete(null)
    } catch {
      setOpError('Network error. Could not delete this package.')
      setConfirmingDelete(null)
    }
  }, [])

  if (packages === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-mono text-sm text-ink-400-dark">Loading…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center px-5 py-20">
        <p className="text-sm text-terra-dark">{loadError}</p>
      </div>
    )
  }

  return (
    // TASK-088: dark forest pass (PAGE_SPECS §C). This page sits in the dark
        // AppShell (bg-void); the old `bg-marble` light placeholder wrapper and its
        // mobile "sheet" radius are gone — the library now renders dark cards/table
        // on the shell, consistent with the dark dashboard.
        <div className="flex min-h-screen flex-col gap-4 p-5 lg:p-8 lg:p-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[27px] leading-tight text-ink-900-dark">Library</h1>
        <p className="text-[12.5px] text-ink-700-dark">
          {packages.length} package{packages.length === 1 ? '' : 's'} · every optimization you&apos;ve run
        </p>
      </div>

      {opError ? (
        <div className="rounded-radius-lg border border-terra-dark/30 bg-terra-tint-dark px-3.5 py-3 text-[12px] text-terra-dark">
          {opError}
        </div>
      ) : null}

      {packages.length === 0 ? (
        <div className="rounded-radius-lg border border-line-dark bg-surface-dark p-8 text-center">
          <p className="text-sm font-medium text-ink-900-dark">No packages yet</p>
          <p className="mt-1 text-[12.5px] text-ink-400-dark">
            Optimize a resume and it will appear here.
          </p>
          <Link
            href="/optimize/target"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-radius-md bg-forest px-5 text-sm font-bold text-ink-900-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-dark focus-visible:ring-offset-2"
          >
            Optimize your resume
          </Link>
        </div>
      ) : null}

      {/* ── MOBILE: cards ── */}
      <div className="grid gap-3 lg:hidden">
        {packages.map((pkg) => {
          const letterPresent = Array.isArray(pkg.cover_letters) && pkg.cover_letters.length > 0
          const atsPresent = pkg.ats_score_card != null
          const qaPresent = pkg.interview_questions != null
          return (
            <div key={pkg.id} className="rounded-radius-lg border border-line-dark bg-surface-dark p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-bold leading-snug text-ink-900-dark">
                    {pkg.target_job_title}
                  </span>
                  <span className="text-[11px] text-ink-400-dark">
                    {pkg.target_company || 'No company'} · {countryLabel(pkg.target_country)} ·{' '}
                    {formatDay(pkg.created_at)}
                  </span>
                </div>
                <StatusSelect initial={pkg.status} onChange={(s) => changeStatus(pkg.id, s)} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <ArtifactChip label="CV ✓" present />
                <ArtifactChip label={atsPresent ? 'ATS ✓' : 'ATS —'} present={atsPresent} />
                <ArtifactChip label={letterPresent ? 'Letter ✓' : 'Letter —'} present={letterPresent} />
                <ArtifactChip label={qaPresent ? 'Q&A ✓' : 'Q&A —'} present={qaPresent} />
              </div>

              <div className="mt-3.5 flex items-center gap-4">
                <Link
                  href={`/package/${pkg.id}`}
                  className="min-h-11 px-1 text-[11px] font-semibold text-forest-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-dark focus-visible:ring-offset-2"
                >
                  Open
                </Link>
                <Link
                  href="/optimize/target"
                  className="min-h-11 px-1 text-[11px] font-semibold text-forest-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-dark focus-visible:ring-offset-2"
                >
                  Re-optimize
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    confirmingDelete === pkg.id ? deletePackage(pkg.id) : setConfirmingDelete(pkg.id)
                  }
                  aria-pressed={confirmingDelete === pkg.id}
                  className={cn(
                    'min-h-11 px-1 text-[11px] font-semibold underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra-dark focus-visible:ring-offset-2',
                    confirmingDelete === pkg.id && 'text-terra-dark underline'
                  )}
                >
                  {confirmingDelete === pkg.id ? 'Confirm delete?' : 'Delete'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── DESKTOP: table ── */}
      <div className="hidden overflow-hidden rounded-radius-lg border border-line-dark bg-surface-dark lg:block">
        <div className="grid grid-cols-[2fr_1fr_1fr_1.2fr_90px] gap-4 border-b border-line-dark bg-surface-2-dark px-5 py-3 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-ink-400-dark">
          <span>Target</span>
          <span>Country</span>
          <span>Level</span>
          <span>Status</span>
          <span />
        </div>
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="grid grid-cols-[2fr_1fr_1fr_1.2fr_90px] items-center gap-4 border-b border-line-dark px-5 py-3.5 last:border-0"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[12.5px] font-semibold text-ink-900-dark">{pkg.target_job_title}</span>
              <span className="text-[10.5px] text-ink-400-dark">
                {pkg.target_company || 'No company'} · {formatDay(pkg.created_at)}
              </span>
            </div>
            <span className="text-[12px] text-ink-700-dark">{countryLabel(pkg.target_country)}</span>
            <span className="text-[12px] text-ink-700-dark">{levelLabel(pkg.optimization_level)}</span>
            <div className="justify-self-start">
              <StatusSelect initial={pkg.status} onChange={(s) => changeStatus(pkg.id, s)} />
            </div>
            <Link
              href={`/package/${pkg.id}`}
              className="min-h-11 px-1 text-[11.5px] font-semibold text-forest-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-dark focus-visible:ring-offset-2"
            >
              Open
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
