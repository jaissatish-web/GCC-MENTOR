'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PackageListPage, PackageSummary } from '@/lib/packageSummary'
import type { Package } from '@/types/package'

/**
 * A service screen's job picker (audit M08 + M06, 2026-09-15).
 *
 * LIST LIGHT, OPEN ONE. The picker lists lightweight summaries (the newest 100,
 * via ?view=summary). Only the chosen job's full package — its letters, Q&A set
 * or interview runs — is fetched, from GET /api/packages/[id]. Before this,
 * every service screen downloaded every job's documents to show one dropdown.
 *
 * A LATE REPLY CANNOT LAND ON THE WRONG JOB. When the user switches job while a
 * detail request is still in flight, the older reply is ignored: each request
 * checks it is still the one the screen is waiting for.
 *
 * `total` is the count across ALL jobs, so a screen can tell "no jobs at all"
 * from "no job with a built CV yet" even when `onlyWithResume` filters the list.
 */
export function usePackagePicker(opts: { requestedId: string | null; onlyWithResume: boolean }) {
  const { requestedId, onlyWithResume } = opts
  const [list, setList] = useState<PackageSummary[] | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Package | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [listKey, setListKey] = useState(0)
  const [detailKey, setDetailKey] = useState(0)
  const waitingFor = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setListError(null)
    const qs = new URLSearchParams({ view: 'summary', limit: '100', counts: '1' })
    if (onlyWithResume) qs.set('resume', '1')
    fetch(`/api/packages?${qs.toString()}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<PackageListPage>
      })
      .then((data) => {
        if (cancelled) return
        const rows = data.packages ?? []
        setList(rows)
        setTotal(typeof data.total === 'number' ? data.total : rows.length)
        setSelectedId((current) => current ?? rows.find((p) => p.id === requestedId)?.id ?? rows[0]?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) setListError('Could not load your saved jobs. Check your connection and try again.')
      })
    return () => {
      cancelled = true
    }
  }, [onlyWithResume, requestedId, listKey])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    waitingFor.current = selectedId
    setDetailLoading(true)
    setDetailError(null)
    const id = selectedId
    fetch(`/api/packages/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<{ package: Package }>
      })
      .then((data) => {
        if (waitingFor.current !== id) return
        setDetail(data.package)
      })
      .catch(() => {
        if (waitingFor.current !== id) return
        setDetail(null)
        setDetailError('Could not open this job. Check your connection and try again.')
      })
      .finally(() => {
        if (waitingFor.current === id) setDetailLoading(false)
      })
  }, [selectedId, detailKey])

  /** Change the local copy of the OPEN job after a save — only if it is still the one open. */
  const updateDetail = useCallback((packageId: string, fn: (p: Package) => Package) => {
    setDetail((current) => (current && current.id === packageId ? fn(current) : current))
  }, [])

  /** Keep the list's flags in step after a save (e.g. one more letter). */
  const patchSummary = useCallback((packageId: string, patch: Partial<PackageSummary>) => {
    setList((rows) => (rows ? rows.map((p) => (p.id === packageId ? { ...p, ...patch } : p)) : rows))
  }, [])

  const selectedSummary = list?.find((p) => p.id === selectedId) ?? null
  const openDetail = detail && detail.id === selectedId ? detail : null

  return {
    list,
    total,
    listError,
    selectedId,
    setSelectedId,
    selectedSummary,
    detail: openDetail,
    detailError,
    detailLoading,
    updateDetail,
    patchSummary,
    reloadList: () => setListKey((k) => k + 1),
    reloadDetail: () => setDetailKey((k) => k + 1),
  }
}
