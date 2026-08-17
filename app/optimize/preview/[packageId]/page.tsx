'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { diffWords } from 'diff'
import { cn } from '@/lib/utils'
import type { CareerProfileFull, ProfileSkill } from '@/types/careerProfile'
import type { OptimizedContent, Package } from '@/types/package'

/**
 * Before / after preview — screen 08 (TASK-033), route
 * /optimize/preview/[packageId].
 *
 * WHAT THIS SCREEN IS NOW: the text editor for a resume that has already been
 * bought. It renders the per-block diff from the package's already-built
 * optimized_content (TASK-021) — we are NOT re-deriving anything, only
 * rendering it as a diff (word-level highlighting + strike-through via the
 * `diff` library; the "added JD language" is computed as words present in the
 * generated text but absent from the source — the before/after comparison).
 * Generated text is inline-editable here (PATCH /api/packages/[id]); fixed
 * fields are not editable.
 *
 * WHAT IT USED TO BE, and why that broke (TASK-145). This was the sales pitch:
 * a free generation, shown blurred and watermarked, with an "Unlock full CV"
 * CTA. TASK-131 inverted the funnel — payment now precedes generation — and
 * added a guard at the top of this component that redirects an unpaid package
 * to /optimize/pay and a paid-but-ungenerated one to /optimize/generate. The
 * guard shipped; the sales pitch did not come out with it. The result was that
 * the ONLY people who could reach this screen were paying customers, and they
 * were shown their own resume blurred, over the words "Unlock to download",
 * with a gold button that bounced them off /optimize/pay straight back again.
 * The blurred preview, the Full CV tab and the Unlock CTA are all gone; the
 * real document lives on /package/[id].
 */

interface Editing {
  summary?: boolean
  blockId?: string
  index?: number
}

function OptimizePreviewPageInner({ packageId }: { packageId: string }) {
  const router = useRouter()
  const [pkg, setPkg] = useState<Package | null>(null)
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>({})
  const [draftSummary, setDraftSummary] = useState('')
  const [draftBullet, setDraftBullet] = useState('')
  const [saveBusy, setSaveBusy] = useState(false)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    Promise.all([
      fetch(`/api/packages/${encodeURIComponent(packageId)}`, { cache: 'no-store' }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch('/api/profile', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([pkgData, profileData]) => {
        if (!pkgData?.package) {
          setError('Package not found.')
          return
        }
        const p = pkgData.package as Package
        // No payment guard while the locks are off (founder decision
        // 2026-08-17). The ungenerated case below still stands, and is not about
        // payment at all: there is genuinely nothing to preview until the model
        // has run, so finish generating first.
        if (!p.optimized_content) {
          router.replace(`/optimize/generate/${encodeURIComponent(packageId)}`)
          return
        }
        setPkg(p)
        setProfile(profileData as CareerProfileFull | null)
      })
      .catch(() => setError('Could not load this package.'))
  }, [packageId, router])

  const oc: OptimizedContent | null = pkg?.optimized_content ?? null

  // Effective "after" value for the summary (user_edited beats generated).
  const summaryAfter = oc?.summary?.user_edited?.trim() || oc?.summary?.generated?.trim() || ''
  const summaryBefore = oc?.summary?.source_profile_summary?.trim() || ''

  // ---- Skills movement chips (original profile order vs package skills_order) ----
  const skillsMovement = useMemo((): Array<{ name: string; movement: number }> => {
    if (!profile || !pkg) return []
    const original = profile.skills.slice().sort((a, b) => a.sort_order - b.sort_order)
    const byId = new Map(profile.skills.map((s) => [s.id, s]))
    const ordered = (pkg.skills_order ?? []).map((id) => byId.get(id)).filter((s): s is ProfileSkill => Boolean(s))
    const orderedIds = new Set(ordered.map((s) => s.id))
    const remaining = original.filter((s) => !orderedIds.has(s.id))
    const newOrder = [...ordered, ...remaining]
    return newOrder.map((skill) => {
      const oldIdx = original.findIndex((s) => s.id === skill.id)
      const newIdx = newOrder.findIndex((s) => s.id === skill.id)
      return { name: skill.name, movement: oldIdx - newIdx } // + = moved up
    })
  }, [profile, pkg])

  const changeCount =
    1 +
    (oc?.experience_blocks ?? []).reduce(
      (n, b) => n + (b.generated_bullets?.length || b.user_edited_bullets?.length || 0),
      0
    ) +
    (skillsMovement.length ? 1 : 0)

  // ---- Edits (PATCH) ---------------------------------------------------------
  const saveSummary = useCallback(async () => {
    if (!pkg) return
    setSaveBusy(true)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(packageId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: { user_edited: draftSummary } }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body?.error as string) ?? 'Could not save this edit.')
      } else {
        setPkg((prev) =>
          prev
            ? {
                ...prev,
                optimized_content: {
                  ...(prev.optimized_content as OptimizedContent),
                  summary: { ...(prev.optimized_content as OptimizedContent).summary, user_edited: draftSummary },
                },
              }
            : prev
        )
        setEditing({})
      }
    } catch {
      setError('Network error. Could not save this edit.')
    } finally {
      setSaveBusy(false)
    }
  }, [pkg, packageId, draftSummary])

  const saveBullet = useCallback(async () => {
    if (!pkg || !editing.blockId || editing.index === undefined) return
    setSaveBusy(true)
    const block = (oc?.experience_blocks ?? []).find((b) => b.profile_experience_id === editing.blockId)
    const current = block?.user_edited_bullets ?? block?.generated_bullets ?? []
    const updated = current.map((b, i) => (i === editing.index ? draftBullet : b))
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(packageId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience_blocks: [{ profile_experience_id: editing.blockId, user_edited_bullets: updated }],
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body?.error as string) ?? 'Could not save this edit.')
      } else {
        setPkg((prev) => {
          if (!prev) return prev
          const nextOc = {
            ...(prev.optimized_content as OptimizedContent),
            experience_blocks: ((prev.optimized_content as OptimizedContent).experience_blocks ?? []).map(
              (b) =>
                b.profile_experience_id === editing.blockId ? { ...b, user_edited_bullets: updated } : b
            ),
          }
          return { ...prev, optimized_content: nextOc }
        })
        setEditing({})
      }
    } catch {
      setError('Network error. Could not save this edit.')
    } finally {
      setSaveBusy(false)
    }
  }, [pkg, packageId, editing, oc, draftBullet])

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
        <p className="text-sm text-terra">{error}</p>
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <p className="font-mono text-sm text-ink-400">Loading…</p>
      </div>
    )
  }

  const handleDone = () => router.push(`/package/${encodeURIComponent(packageId)}`)

  return (
    <main className="flex min-h-dvh flex-col bg-bg">
      <div className="flex flex-col gap-3 px-5 pb-4 pt-1.5">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-radius-md text-[20px] leading-none text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-deep focus-visible:ring-offset-2"
        >
          ←
        </button>
        <h1 className="font-serif text-[26px] leading-tight text-ink-900">Here&apos;s what changed</h1>
        {/* The "Full CV" tab is gone (TASK-145). It showed a blurred,
            watermarked raster of the resume — the pre-payment sales pitch —
            on a screen only a paying customer can now reach. The real,
            unblurred document already has a screen of its own at
            /package/[id], which is also where downloading and template
            switching live; rendering it a second time here would be the
            duplicate that TASK-141 deliberately avoided. */}
        <p className="text-[12px] text-ink-400">{changeCount} change{changeCount === 1 ? '' : 's'} to review</p>
      </div>

      {/* lg: two columns — left = the changes/edit panel, right rail = the same
          "back to your CV" action the mobile footer carries. The rail used to
          hold a blurred preview and an Unlock CTA; both are gone (TASK-145).
          This screen is reachable only by a paying customer now, so selling
          them the resume they already own was the defect, not the layout. */}
      <div className="flex flex-1 flex-col lg:flex-row lg:gap-4 lg:px-8 lg:pb-6">
        <ChangesTab
          oc={oc}
          summaryBefore={summaryBefore}
          summaryAfter={summaryAfter}
          editing={editing}
          draftSummary={draftSummary}
          draftBullet={draftBullet}
          setDraftSummary={setDraftSummary}
          setDraftBullet={setDraftBullet}
          setEditing={setEditing}
          saveSummary={saveSummary}
          saveBullet={saveBullet}
          saveBusy={saveBusy}
          skillsMovement={skillsMovement}
          profile={profile}
          onDone={handleDone}
        />

        <aside className="hidden shrink-0 flex-col gap-3 lg:flex lg:w-[340px] lg:border-l lg:border-line-light lg:pl-5">
          <p className="text-[11.5px] leading-relaxed text-ink-400">
            Edit the generated wording here. Every change saves as you make it, and appears on your
            CV and in the PDF you download.
          </p>
          <button
            type="button"
            onClick={handleDone}
            className="min-h-11 w-full rounded-radius-md bg-redesign-gold px-4 py-4 text-[15px] font-bold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2"
          >
            Back to your CV
          </button>
        </aside>
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Changes tab
// ---------------------------------------------------------------------------
// @types/diff returns `Change[]` for diffWords; use a local structural type so
// we don't depend on the exact named export.
interface DiffToken {
  value: string
  added?: boolean
  removed?: boolean
}

function renderDiffParts(parts: DiffToken[]) {
  return parts.map((p, i) => {
    if (p.added) return <mark key={i} className="rounded-sm bg-diff-added px-0.5 text-ink-700">{p.value}</mark>
    if (p.removed) return null // removed words belong in the "before" strike line
    return <span key={i}>{p.value}</span>
  })
}

function wordsIn(str: string | undefined | null): number {
  return (str ?? '').split(/\s+/).filter(Boolean).length
}

function ChangesTab({
  oc,
  summaryBefore,
  summaryAfter,
  editing,
  draftSummary,
  draftBullet,
  setDraftSummary,
  setDraftBullet,
  setEditing,
  saveSummary,
  saveBullet,
  saveBusy,
  skillsMovement,
  profile,
  onDone,
}: {
  oc: OptimizedContent | null
  summaryBefore: string
  summaryAfter: string
  editing: Editing
  draftSummary: string
  draftBullet: string
  setDraftSummary: (s: string) => void
  setDraftBullet: (s: string) => void
  setEditing: (e: Editing) => void
  saveSummary: () => void
  saveBullet: () => void
  saveBusy: boolean
  skillsMovement: Array<{ name: string; movement: number }>
  profile: CareerProfileFull | null
  onDone: () => void
}) {
  return (
    <>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pb-4">
        {/* Professional summary */}
        <div className="flex flex-col gap-3 rounded-radius-lg border border-line-light bg-surface-light p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-ink-900">Professional summary</span>
            <span className="rounded-[5px] bg-forest-tint px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-forest">
              Rewritten
            </span>
          </div>

          <div className="rounded-[9px] border-l-2 border-terra/40 bg-surface-2-light p-3">
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-terra">Before</div>
            <p className="text-[11.5px] leading-relaxed text-ink-400">{summaryBefore}</p>
          </div>

          <div className="rounded-[9px] border-l-2 border-forest bg-forest-tint p-3">
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-forest">After</div>
            {editing.summary ? (
              <textarea
                value={draftSummary}
                onChange={(e) => setDraftSummary(e.target.value)}
                rows={5}
                className="min-h-11 w-full resize-none rounded-radius-md border border-line-light bg-surface-light p-2 text-[11.5px] text-ink-700 outline-none focus:border-forest-deep focus:ring-2 focus:ring-forest-deep/20"
              />
            ) : (
              <p className="text-[11.5px] leading-relaxed text-ink-900">
                {renderDiffParts(diffWords(summaryBefore, summaryAfter || '').filter((p) => !p.removed))}
              </p>
            )}
          </div>

          {editing.summary ? (
            <div className="flex gap-2">
              <button type="button" disabled={saveBusy} onClick={() => saveSummary()}
                className="min-h-11 rounded-radius-md bg-forest px-3.5 text-[11px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2">
                {saveBusy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" disabled={saveBusy} onClick={() => setEditing({})}
                className="min-h-11 rounded-radius-md border border-line-light-strong bg-surface-light px-3.5 text-[11px] font-semibold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-deep focus-visible:ring-offset-2">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-forest">Edit this text</span>
              <span className="text-[10px] text-ink-400">· any generated line</span>
            </div>
          )}
        </div>

        {/* Work bullets */}
        {(oc?.experience_blocks ?? []).map((block) => {
          const source = block.source_bullets ?? []
          const effective = block.user_edited_bullets ?? block.generated_bullets ?? []
          return effective.map((bullet, bi) => {
            const src = source[bi]
            const parts = diffWords(src ? src : '', bullet)
            const added = parts.filter((p) => p.added)
            const removedParts = parts.filter((p) => p.removed)
            const afterParts = parts.filter((p) => !p.removed)
            const isEditing = editing.blockId === block.profile_experience_id && editing.index === bi
            const company = profile?.work_experience?.find((w) => w.id === block.profile_experience_id)?.company ?? ''
            return (
              <div key={block.profile_experience_id + ':' + bi} className="flex flex-col gap-2 rounded-radius-lg border border-line-light bg-surface-light p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-bold text-ink-900">{company} — bullet {bi + 1} of {effective.length}</span>
                  {src ? <span className="font-mono text-[10px] text-ink-400">+{wordsIn(added.map((p) => p.value).join(' '))} JD terms</span> : null}
                </div>
                {isEditing ? (
                  <textarea
                    value={draftBullet}
                    onChange={(e) => setDraftBullet(e.target.value)}
                    rows={3}
                    className="min-h-11 w-full resize-none rounded-radius-md border border-line-light bg-surface-light p-2 text-[11.5px] text-ink-700 outline-none focus:border-forest-deep focus:ring-2 focus:ring-forest-deep/20"
                  />
                ) : (
                  <p className="text-[11.5px] leading-relaxed text-ink-900">
                    {removedParts.length ? (
                      <>
                        <span className="text-diff-removed line-through">{removedParts.map((p) => p.value).join('')}</span>{' '}
                        <span>→</span>{' '}
                      </>
                    ) : null}
                    {afterParts.map((p, i) => (p.added ? (
                      <mark key={i} className="rounded-sm bg-diff-added px-0.5 text-ink-700">{p.value}</mark>
                    ) : (
                      <span key={i}>{p.value}</span>
                    )))}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button type="button" disabled={saveBusy} onClick={() => saveBullet()}
                        className="min-h-9 rounded-radius-md bg-forest px-3 text-[11px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2">
                        Save
                      </button>
                      <button type="button" disabled={saveBusy} onClick={() => setEditing({})}
                        className="min-h-9 rounded-radius-md border border-line-light-strong bg-surface-light px-3 text-[11px] font-semibold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-deep focus-visible:ring-offset-2">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing({ blockId: block.profile_experience_id, index: bi })
                        setDraftBullet(bullet)
                      }}
                      className="min-h-11 px-1 text-[11px] font-semibold text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                    >
                      Edit this text
                    </button>
                  )}
                </div>
              </div>
            )
          })
        })}

        {/* Skills reordered */}
        {skillsMovement.length ? (
          <div className="flex flex-col gap-2.5 rounded-radius-lg border border-line-light bg-surface-light p-4">
            <span className="text-[12px] font-bold text-ink-900">Skills reordered</span>
            <div className="flex flex-wrap gap-1.5">
              {skillsMovement.map((s, i) => (
                <span
                  key={i}
                  className={cn(
                    'rounded-[99px] border px-2.5 py-1 text-[11px] font-medium',
                    s.movement !== 0
                      ? 'border-forest/40 bg-forest-tint text-forest'
                      : 'border-line-light bg-surface-2-light text-ink-700'
                  )}
                >
                  {s.name} {s.movement > 0 ? `↑${s.movement}` : s.movement < 0 ? `↓${Math.abs(s.movement)}` : '·'}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer — below lg; on lg the right rail carries the same action. */}
      <div className="flex flex-col gap-1.5 px-5 pb-6 pt-3 lg:hidden">
        <button
          type="button"
          onClick={onDone}
          className="min-h-11 rounded-[13px] bg-redesign-gold px-4 py-4 text-[15px] font-bold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2"
        >
          Back to your CV
        </button>
        <p className="text-center text-[11px] text-ink-400">Edits save as you make them</p>
      </div>
    </>
  )
}

// Suspense wrapper (params access is fine, kept for future useSearchParams safety).
export default function OptimizePreviewPage({
  params,
}: {
  params: { packageId: string }
}) {
  const packageId = params.packageId
  return (
    <Suspense>
      <OptimizePreviewPageInner packageId={packageId} />
    </Suspense>
  )
}
