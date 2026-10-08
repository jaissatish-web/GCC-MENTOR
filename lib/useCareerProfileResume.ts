'use client'
import { useCallback, useEffect, useState } from 'react'
import type { PackageSummary } from '@/lib/packageSummary'

export async function fetchCareerProfileResumeSummary(): Promise<PackageSummary | null> {
  const response = await fetch('/api/packages/career-profile', { method: 'POST' })
  if (!response.ok) throw new Error('Could not open Career Profile Resume')
  const data = await response.json()
  return data.summary ?? null
}

export function useCareerProfileResume() {
  const [resume, setResume] = useState<PackageSummary | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    let active = true
    setState('loading')
    fetchCareerProfileResumeSummary()
      .then((summary) => {
        if (!active) return
        setResume(summary)
        setState(summary ? 'ready' : 'missing')
      })
      .catch(() => { if (active) setState('error') })
    return () => { active = false }
  }, [reloadKey])
  const reload = useCallback(() => setReloadKey((key) => key + 1), [])
  return { resume, setResume, state, reload }
}
