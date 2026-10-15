'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BriefcaseBusiness, FileText, Mic, UserRound } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import type { PackageListPage, PackageSummary } from '@/lib/packageSummary'
import { fetchCareerProfileResumeSummary } from '@/lib/useCareerProfileResume'
import { isCareerProfileResume } from '@/lib/careerProfileResume'
import { applicationHref, APPLICATION_SELECTION_KEY, JOURNEY_GOAL_KEY, journeyNextAction, selectApplication, validGoal, type JourneyGoal } from '@/lib/applicationJourney'
import { stageSnapshot } from './stages'
import type { NextAction } from '@/lib/nextAction'

interface Workspace {
  selected: PackageSummary | null
  rows: PackageSummary[]
  ready: boolean
  locked: boolean
  setLocked: (value: boolean) => void
  error: boolean
  selectionMissing: boolean
  hasProfile: boolean
  goal: JourneyGoal | null
  nextAction: NextAction | null
  snapshot: ReturnType<typeof stageSnapshot> | null
  select: (id: string) => void
  setGoal: (goal: JourneyGoal | null) => void
  href: (href: string) => string
  refresh: () => void
}
const Context = createContext<Workspace | null>(null)
export const useApplicationWorkspace = () => useContext(Context)
export function useApplicationLock(busy: boolean) {
  const setLocked = useApplicationWorkspace()?.setLocked
  useEffect(() => { setLocked?.(busy); return () => setLocked?.(false) }, [busy, setLocked])
}

/** Tab-scoped IDs only. Every stored selection is checked against the signed-in user's summaries. */
export function ApplicationWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [selection, setSelection] = useState<string | null>(null)
  const [goal, updateGoal] = useState<JourneyGoal | null>(null)
  const [rows, setRows] = useState<PackageSummary[]>([])
  const [profileScore, setProfileScore] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [locked, setLocked] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    try {
      setSelection(sessionStorage.getItem(APPLICATION_SELECTION_KEY))
      const savedGoal = sessionStorage.getItem(JOURNEY_GOAL_KEY)
      if (validGoal(savedGoal)) updateGoal(savedGoal)
    } catch { /* Browsing without storage still supports navigation. */ }
  }, [])
  useEffect(() => {
    let alive = true
    setError(false)
    Promise.all([
      fetch('/api/profile', { cache: 'no-store' }).then(async r => {
        if (r.status === 404) return { score: null, raw: null }
        if (!r.ok) throw new Error('Profile unavailable')
        const p = await r.json()
        const raw = await fetchCareerProfileResumeSummary()
        return { score: typeof p.readiness_score === 'number' ? p.readiness_score : 0, raw }
      }),
      fetch('/api/packages?view=summary&limit=100', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('Applications unavailable'); return r.json() as Promise<PackageListPage> }),
      fetch('/api/profile/pending-draft', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([profile, page, draft]) => {
      if (!alive) return
      setProfileScore(profile.score)
      const nextRows = [...(profile.raw ? [profile.raw] : []), ...page.packages.filter(p => p.id !== profile.raw?.id)]
      setRows(nextRows)
      setPending(Boolean(draft?.pending))
      // Opening a saved CV makes it the application the rest of the shell follows.
      const routeId = pathname?.match(/^\/(?:package|optimize\/(?:preview|pay|generate))\/([^/]+)/)?.[1]
      if (routeId && nextRows.some(p => p.id === routeId)) { setSelection(routeId); try { sessionStorage.setItem(APPLICATION_SELECTION_KEY, routeId) } catch { /* optional */ } }
      setReady(true)
    }).catch(() => { if (alive) { setError(true); setReady(false) } })
    return () => { alive = false }
  }, [pathname, revision])
  const select = useCallback((id: string) => {
    if (locked) return
    setSelection(id)
    try { sessionStorage.setItem(APPLICATION_SELECTION_KEY, id) } catch { /* optional */ }
  }, [locked])
  const setGoal = useCallback((value: JourneyGoal | null) => {
    updateGoal(value)
    try { if (value) sessionStorage.setItem(JOURNEY_GOAL_KEY, value); else sessionStorage.removeItem(JOURNEY_GOAL_KEY) } catch { /* optional */ }
  }, [])
  useEffect(() => {
    const update = () => setRevision(n => n + 1)
    window.addEventListener('gcc-profile-updated', update)
    return () => window.removeEventListener('gcc-profile-updated', update)
  }, [])
  const selected = selectApplication(rows, selection)
  const selectedRows = selected && !isCareerProfileResume(selected) ? [selected] : rows.filter(p => !isCareerProfileResume(p))
  const selectionMissing = Boolean(ready && selection && selection !== 'general' && !rows.some(p => p.id === selection))
  const nextAction = ready ? journeyNextAction(profileScore !== null, profileScore ?? 0, rows, selected, pending, goal) : null
  const snapshot = ready ? stageSnapshot(profileScore, selectedRows) : null
  const href = useCallback((target: string) => applicationHref(target, selected), [selected])
  const refresh = useCallback(() => setRevision(n => n + 1), [])
  const value = useMemo(() => ({ selected, rows, ready, locked, setLocked, error, selectionMissing, hasProfile: profileScore !== null, goal, nextAction, snapshot, select, setGoal, href, refresh }), [selected, rows, ready, locked, error, selectionMissing, profileScore, goal, nextAction, snapshot, select, setGoal, href, refresh])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function ApplicationContextBar() {
  const router = useRouter()
  const pathname = usePathname()
  const workspace = useApplicationWorkspace()
  if (!workspace) return null
  if (workspace.error) return <div className="border-b border-line px-4 py-2 text-sm" role="status">Application context could not be loaded. <button onClick={workspace.refresh} className="min-h-11 px-2 font-semibold text-teal underline">Try again</button></div>
  if (!workspace.ready || !workspace.rows.length) return null
  return <section aria-label="Current preparation" className="ui-context-bar flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-white px-4 py-3 sm:px-6">
    <label className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm font-semibold text-ink">
      Preparing
      <select aria-label="Current application" disabled={workspace.locked} value={workspace.selected?.id ?? ''} onChange={e => { const id = e.target.value; workspace.select(id); if (['/cover-letter', '/interview-qa', '/mock-interview'].includes(pathname ?? '')) router.replace(`${pathname}?package=${encodeURIComponent(id)}`, { scroll: false }) }} className="min-h-11 min-w-0 max-w-full flex-1 rounded-ctl border border-line bg-white px-3 py-2 font-normal sm:max-w-md">
        {workspace.rows.map(p => <option key={p.id} value={p.id}>{isCareerProfileResume(p) ? 'General CV — from your profile' : [p.name || p.target_job_title, p.target_company].filter(Boolean).join(' · ')}</option>)}
      </select>
    </label>
    {workspace.selectionMissing ? <p role="status" className="text-sm text-ink-soft">The previous CV is unavailable. Choose a current CV above.</p> : null}
    <Link href="/dashboard/library" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal">My applications &amp; CVs</Link>
  </section>
}

export function GoalChooser() {
  const workspace = useApplicationWorkspace()
  const goals = [
    ['application', 'Prepare a job application', 'Tailor a CV, then choose the letter and practice you need.', '/optimize/target'],
    ['cv', 'Improve my general CV', 'Review your profile and choose a CV template.', '/profile'],
    ['interview', 'Practise an interview', 'Type or record answers. A job description is optional.', '/mock-interview'],
    ['professional', 'Improve my recruiter profile', 'Prepare content to copy to LinkedIn or NaukriGulf.', '/linkedin-optimization'],
  ] as const
  const icons = { application: BriefcaseBusiness, cv: FileText, interview: Mic, professional: UserRound }
  const tones = { application: 'tailor', cv: 'library', interview: 'mock', professional: 'linkedin' }
  return <details open={!workspace?.hasProfile} className="rounded-card border border-line bg-white p-4"><summary id="journey-goal" className="min-h-11 cursor-pointer content-center font-semibold text-ink">{workspace?.goal ? `Your goal: ${goals.find(g => g[0] === workspace.goal)?.[1]} — change goal` : 'Choose your preparation goal'}</summary><p className="mt-2 text-sm text-ink-soft">Choose a goal. You can change it anytime; you do not need every service.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{goals.map(([id, title, body, target]) => { const Icon = icons[id]; return <Link data-ui-service={tones[id]} aria-current={workspace?.goal === id ? 'true' : undefined} key={id} href={workspace?.hasProfile ? workspace.href(target) : '/profile?import=upload'} onClick={() => workspace?.setGoal(id)} className="ui-goal-card ui-service-card rounded-card border border-line bg-white p-4 hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"><span className="ui-service-icon flex size-9 shrink-0 items-center justify-center rounded-ctl"><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><h3 className="font-semibold text-ink">{title}</h3><p className="mt-1 text-sm leading-6 text-ink-soft">{body}</p>{!workspace?.hasProfile ? <p className="mt-2 text-sm font-semibold text-teal">First, add your CV →</p> : null}</div></Link>})}</div></details>
}
