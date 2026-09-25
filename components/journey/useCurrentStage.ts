'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { PackageListPage } from '@/lib/packageSummary'
import { stageSnapshot, type StageSnapshot } from './stages'

/**
 * Where the signed-in user is on the three steps — for the nav and the step
 * gates, so they can mark "you are here" and lock only what truly cannot open.
 *
 * Reads the same two endpoints the dashboard reads and runs the same pure
 * `computeNextAction`, so the nav and the dashboard never disagree. No new API.
 *
 * Cached at module scope (the shell re-renders on every route change), and
 * refreshed whenever the user lands on the dashboard — where every flow
 * returns after finishing something.
 */


let cache: StageSnapshot | null = null

export function useCurrentStage(): StageSnapshot | null {
  const pathname = usePathname()
  const [snap, setSnap] = useState<StageSnapshot | null>(cache)

  useEffect(() => {
    if (cache && pathname !== '/dashboard') return
    let alive = true
    Promise.all([
      fetch('/api/profile', { cache: 'no-store' }).then((r) => (r.status === 404 ? null : r.ok ? r.json() : Promise.reject())),
      fetch('/api/packages?view=summary&limit=20', { cache: 'no-store' }).then((r) =>
        r.ok ? (r.json() as Promise<PackageListPage>) : Promise.reject()
      ),
    ])
      .then(([profile, page]) => {
        const score = profile ? (typeof profile.readiness_score === 'number' ? profile.readiness_score : 0) : null
        cache = stageSnapshot(score, page?.packages ?? [])
        if (alive) setSnap(cache)
      })
      .catch(() => {
        /* the nav simply shows no progress marks */
      })
    return () => {
      alive = false
    }
  }, [pathname])

  return snap
}
