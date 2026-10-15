'use client'

import { useApplicationWorkspace } from '@/components/journey/ApplicationWorkspace'
import { cvReady } from '@/lib/packageSummary'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PackageListPage, PackageSummary } from '@/lib/packageSummary'
import { fetchCareerProfileResumeSummary } from '@/lib/useCareerProfileResume'
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
  const workspace = useApplicationWorkspace()
  const selectWorkspace = workspace?.select
  const refreshWorkspace = workspace?.refresh
  const workspaceRows = workspace?.rows
  const workspaceReady = workspace?.ready
  const workspaceError = workspace?.error
  const workspaceSelectedId = workspace?.selected?.id
  const appliedRequest = useRef<string | null | undefined>(undefined)
  const [list, setList] = useState<PackageSummary[] | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedId, setSelectedIdLocal] = useState<string | null>(null)
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdLocal(id)
    if (id) selectWorkspace?.(id)
  }, [selectWorkspace])
  const [detail, setDetail] = useState<Package | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [listKey, setListKey] = useState(0)
  const [detailKey, setDetailKey] = useState(0)
  const waitingFor = useRef<string | null>(null)

  useEffect(() => {
    if (workspace) return
    let cancelled = false
    setListError(null)
    const qs = new URLSearchParams({ view: 'summary', limit: '100', counts: '1' })
    if (onlyWithResume) qs.set('resume', '1')
    Promise.all([fetch(`/api/packages?${qs.toString()}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<PackageListPage>
      }), fetchCareerProfileResumeSummary().then((resume) => ({ resume, error: false })).catch(() => ({ resume: null, error: true }))])
      .then(([data, raw]) => {
        if (cancelled) return
        if (raw.error && (!(data.packages?.length) || (requestedId && !data.packages.some((p) => p.id === requestedId)))) throw new Error('Profile resume unavailable')
        const rows = [...(raw.resume ? [raw.resume] : []), ...(data.packages ?? []).filter((p) => p.id !== raw.resume?.id)]
        setList(rows)
        setTotal(typeof data.total === 'number' ? data.total + Number(Boolean(raw.resume)) : rows.length)
        setSelectedIdLocal((current) => current ?? rows.find((p) => p.id === requestedId)?.id ?? rows[0]?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) setListError('Could not load your saved jobs. Check your connection and try again.')
      })
    return () => {
      cancelled = true
    }
  }, [onlyWithResume, requestedId, listKey, workspace])

  useEffect(() => {
    if (!workspaceRows) return
    if (workspaceError) { setListError('Could not load your saved CVs. Try again.'); return }
    if (!workspaceReady) return
    const rows = onlyWithResume ? workspaceRows.filter(cvReady) : workspaceRows
    setList(rows)
    setTotal(workspaceRows.length)
    setListError(null)
    const requestChanged = appliedRequest.current !== requestedId
    appliedRequest.current = requestedId
    const requested = requestChanged ? rows.find(p => p.id === requestedId) : null
    if (requestChanged && requestedId && !requested) {
      setSelectedIdLocal(null)
      setListError('That CV is no longer available in your recent applications. Choose a CV using Preparing above, or open My applications & CVs.')
      return
    }
    const selected = requested ?? rows.find(p => p.id === workspaceSelectedId) ?? rows[0]
    setSelectedIdLocal(selected?.id ?? null)
    if (requested && requested.id !== workspaceSelectedId) selectWorkspace?.(requested.id)
  }, [workspaceRows, workspaceSelectedId, workspaceReady, workspaceError, selectWorkspace, onlyWithResume, requestedId])

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
    refreshWorkspace?.()
  }, [refreshWorkspace])

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
    reloadList: () => workspace ? workspace.refresh() : setListKey((k) => k + 1),
    reloadDetail: () => setDetailKey((k) => k + 1),
  }
}
