'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, use, useEffect, useMemo, useRef, useState } from 'react'
import { diffWords } from 'diff'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { readMatchReport } from '@/components/optimizer/MatchResult'
import { applySuggestionsToDocument, type Suggestion } from '@/lib/optimizer/suggestions'
import { scoreDocumentFromResume, scoreResume } from '@/lib/optimizer/score'
import { NAMES } from '@/lib/serviceLabels'
import type { ResumeDocument } from '@/lib/resumeDocument'
import type { MatchReport } from '@/lib/optimizer/types'
import type { Package } from '@/types/package'
import type { ProfileSkill } from '@/types/careerProfile'

/**
 * REVIEW YOUR OPTIMIZED CV — /optimize/preview/[packageId] (rebuilt 2026-09-17,
 * founder request). The build screen lands here.
 *
 * One page with the three parts the optimizer touches — Professional summary,
 * Skills, Work experience — every word coloured by where it came from:
 *
 *   green   reworded by the optimizer, from the candidate's own profile
 *   blue    a keyword from the job description
 *   yellow  a suggested line or skill the profile does not state (Moderate/High)
 *
 * Everything is editable in place. Yellow items start selected, so the level's
 * target score is visible at once, and the live ATS score updates with every
 * change (same deterministic scorer as the server). Saving requires the user to
 * confirm the yellow items they kept are true. One PATCH saves it all into the
 * optimized result: the edited document, then kept suggestions confirmed (with
 * the user's wording) and the rest dismissed. The Career Profile never changes.
 */

type Draft = { keep: boolean; text: string }

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Split text into plain / job-keyword pieces. */
function keywordPieces(text: string, re: RegExp | null): Array<{ t: string; kw: boolean }> {
  if (!re || !text) return [{ t: text, kw: false }]
  const out: Array<{ t: string; kw: boolean }> = []
  let last = 0
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0
    if (i > last) out.push({ t: text.slice(last, i), kw: false })
    out.push({ t: m[0], kw: true })
    last = i + m[0].length
  }
  if (last < text.length) out.push({ t: text.slice(last), kw: false })
  return out
}

function Colored({ text, source, re }: { text: string; source: string | null; re: RegExp | null }) {
  const parts = source === null ? [{ value: text, added: false }] : diffWords(source, text).filter((p) => !p.removed)
  return (
    <>
      {parts.map((p, i) =>
        keywordPieces(p.value, re).map((k, j) => (
          <span
            key={`${i}-${j}`}
            className={cn(
              p.added && 'rounded-[3px] bg-ok-soft text-ink',
              k.kw && 'rounded-[3px] bg-[#DCEAF7] font-semibold text-sec-status',
            )}
          >
            {k.t}
          </span>
        )),
      )}
    </>
  )
}

function PreviewInner({ packageId }: { packageId: string }) {
  const router = useRouter()
  const [pkg, setPkg] = useState<Package | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState('')
  const [skills, setSkills] = useState<ProfileSkill[]>([])
  const [roles, setRoles] = useState<Record<string, string[]>>({})
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    fetch(`/api/packages/${encodeURIComponent(packageId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const p = data?.package as Package | undefined
        if (!p) return setError('Could not find this CV.')
        if (!p.optimized_content) return router.replace(`/optimize/generate/${encodeURIComponent(packageId)}`)
        const doc = p.document_snapshot as ResumeDocument | null
        if (!doc) return router.replace(`/package/${encodeURIComponent(packageId)}/edit`)
        setPkg(p)
        setSummary(doc.summary ?? '')
        setSkills(doc.skills ?? [])
        setRoles(Object.fromEntries(doc.experience.map((x) => [x.entry.id, [...x.bullets]])))
        const report = readMatchReport(p.match_report)
        const pending = (report?.suggestions ?? []).filter((s) => s.status === 'pending')
        setDrafts(Object.fromEntries(pending.map((s) => [s.id, { keep: true, text: s.text }])))
      })
      .catch(() => setError('Could not load this CV. Check your connection and try again.'))
  }, [packageId, router])

  const report: MatchReport | null = pkg ? readMatchReport(pkg.match_report) : null
  const doc = (pkg?.document_snapshot as ResumeDocument | null) ?? null
  const oc = pkg?.optimized_content ?? null
  const pending: Suggestion[] = useMemo(() => (report?.suggestions ?? []).filter((s) => s.status === 'pending'), [report])

  const keywordRe = useMemo(() => {
    const terms = (report?.target.keywords ?? [])
      .flatMap((k) => [k.term, ...(k.aliases ?? [])])
      .map((t) => t.trim())
      .filter((t) => t.length >= 2)
      .sort((a, b) => b.length - a.length)
    if (terms.length === 0) return null
    return new RegExp(`(?<![A-Za-z0-9])(?:${terms.map(escapeRe).join('|')})(?![A-Za-z0-9])`, 'gi')
  }, [report])

  const edited: ResumeDocument | null = useMemo(
    () =>
      doc
        ? {
            ...doc,
            summary,
            skills,
            experience: doc.experience.map((x) => ({ ...x, bullets: (roles[x.entry.id] ?? x.bullets).filter((b) => b.trim()) })),
          }
        : null,
    [doc, summary, skills, roles],
  )
  const kept = useMemo(
    () => pending.filter((s) => drafts[s.id]?.keep && drafts[s.id]?.text.trim()).map((s) => ({ ...s, text: drafts[s.id].text.trim() })),
    [pending, drafts],
  )
  const liveScore = useMemo(() => {
    if (!edited || !report) return null
    return scoreResume(scoreDocumentFromResume(applySuggestionsToDocument(edited, kept)), report.target, report.qualifications ?? null).total
  }, [edited, kept, report])

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-3 sm:px-5">
        <Alert variant="danger">{error}</Alert>
      </main>
    )
  }
  if (!pkg || !doc || !oc || !edited) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas">
        <p className="font-mono text-sm text-ink-muted">Loading your optimized CV…</p>
      </main>
    )
  }

  const before = report?.before.total ?? null
  const band = report?.target_band ?? null
  const summarySource = (oc.summary?.source_profile_summary ?? '').trim()
  const bySkillName = new Set(doc.skills.map((s) => s.name.toLowerCase()))
  const skillSuggestions = pending.filter((s) => s.block === 'skills')
  const needsConfirm = kept.length > 0

  const save = async () => {
    if (needsConfirm && !confirmed) {
      setSaveError('Tick the box to confirm the yellow items you kept are true for you.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(packageId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: edited,
          ...(pending.length
            ? {
                suggestion_actions: pending.map((s) =>
                  drafts[s.id]?.keep && drafts[s.id]?.text.trim()
                    ? { id: s.id, action: 'confirm', text: drafts[s.id].text.trim() }
                    : { id: s.id, action: 'dismiss', text: null },
                ),
              }
            : {}),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError((body?.error as string) ?? 'Could not save your CV. Please try again.')
        return
      }
      router.push(`/package/${encodeURIComponent(packageId)}`)
    } catch {
      setSaveError('Network error. Could not save your CV.')
    } finally {
      setSaving(false)
    }
  }

  const setDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? { keep: true, text: '' }), ...patch } }))

  return (
    <main className="min-h-dvh bg-canvas pb-44 font-redesign-sans">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-muted">Review · edit · save</p>
          <h1 className="font-display text-[27px] leading-tight text-ink">Your optimized CV</h1>
          <p className="text-[13px] text-ink-soft">
            For <strong className="text-ink">{pkg.target_job_title}</strong>
            {pkg.target_company ? ` · ${pkg.target_company}` : ''} · {pkg.optimization_level.charAt(0).toUpperCase() + pkg.optimization_level.slice(1)} optimization.
            Click any text to edit it. Nothing is saved until you press Save.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 rounded-card border border-line bg-white p-3 text-[12.5px]">
          <span className="rounded-[4px] bg-ok-soft px-2 py-1 text-ink">Green · reworded from your profile</span>
          <span className="rounded-[4px] bg-[#DCEAF7] px-2 py-1 font-semibold text-sec-status">Blue · job description keyword</span>
          <span className="rounded-[4px] border border-gold/60 bg-gold-soft px-2 py-1 text-ink">Yellow · suggested, not in your profile — keep only if true</span>
        </div>

        {/* SUMMARY */}
        <Section title="Professional summary" tone="border-sec-summary/40" accent="text-sec-summary" icon="📝">
          {editing === 'summary' ? (
            <EditBox value={summary} rows={6} onChange={setSummary} onDone={() => setEditing(null)} />
          ) : (
            <ClickToEdit onEdit={() => setEditing('summary')}>
              {summary.trim() ? (
                <p className="text-[14.5px] leading-relaxed text-ink">
                  <Colored text={summary} source={summarySource} re={keywordRe} />
                </p>
              ) : (
                <p className="text-[13px] text-ink-muted">No summary yet — click to write one.</p>
              )}
            </ClickToEdit>
          )}
          {pending
            .filter((s) => s.block === 'summary')
            .map((s) => (
              <SuggestedLine key={s.id} s={s} draft={drafts[s.id]} onChange={(p) => setDraft(s.id, p)} re={keywordRe} />
            ))}
        </Section>

        {/* SKILLS */}
        <Section title="Skills" tone="border-sec-skills/40" accent="text-sec-skills" icon="🧩">
          <p className="text-[12.5px] text-ink-muted">Ordered by relevance to this job. Tap × to remove a skill.</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((k) => {
              const isKeyword = !!keywordRe && new RegExp(keywordRe.source, 'i').test(k.name)
              return (
                <span
                  key={k.id}
                  className={cn(
                    'inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-[13px]',
                    isKeyword ? 'border-sec-status/40 bg-[#DCEAF7] font-semibold text-sec-status' : 'border-line bg-white text-ink',
                  )}
                >
                  {k.name}
                  <button
                    type="button"
                    aria-label={`Remove ${k.name}`}
                    onClick={() => setSkills((list) => list.filter((x) => x.id !== k.id))}
                    className="ml-1 min-h-8 min-w-6 text-ink-muted hover:text-alert"
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
          {skillSuggestions.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-ctl border border-gold/50 bg-gold-soft/60 p-3">
              <p className="text-[12.5px] font-semibold text-ink">The job asks for these skills. Keep the ones you really have:</p>
              <div className="flex flex-wrap gap-2">
                {skillSuggestions
                  .filter((s) => !bySkillName.has(s.text.toLowerCase()))
                  .map((s) => {
                    const on = !!drafts[s.id]?.keep
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => setDraft(s.id, { keep: !on })}
                        className={cn(
                          'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px]',
                          on ? 'border-gold bg-gold-soft font-semibold text-ink' : 'border-dashed border-line-strong bg-white text-ink-muted line-through',
                        )}
                      >
                        <span aria-hidden="true">{on ? '✓' : '+'}</span>
                        {s.text}
                      </button>
                    )
                  })}
              </div>
            </div>
          ) : null}
        </Section>

        {/* WORK EXPERIENCE */}
        <Section title="Work experience" tone="border-sec-experience/40" accent="text-sec-experience" icon="💼">
          <p className="text-[12.5px] text-ink-muted">Employers, job titles and dates stay exactly as in your profile.</p>
          {doc.experience.map((item) => {
            const id = item.entry.id
            const block = oc.experience_blocks.find((b) => b.profile_experience_id === id)
            const source = (block?.source_bullets ?? []).join(' ')
            const bullets = roles[id] ?? item.bullets
            const lines = pending.filter((s) => s.block === id)
            return (
              <div key={id} className="flex flex-col gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[14.5px] font-bold text-ink">
                    {item.entry.role} <span className="font-normal text-ink-soft">· {item.companyLine}</span>
                  </p>
                  <span className="text-[12px] text-ink-muted">{item.range}</span>
                </div>
                {block && !block.was_optimized ? (
                  <p className="text-[12px] text-ink-muted">Kept in your own words (the rewrite could not be proven from your profile).</p>
                ) : null}
                {editing === id ? (
                  <EditBox
                    value={bullets.join('\n')}
                    rows={Math.max(4, bullets.length + 1)}
                    hint="One activity per line."
                    onChange={(v) => setRoles((r) => ({ ...r, [id]: v.split('\n') }))}
                    onDone={() => setEditing(null)}
                  />
                ) : (
                  <ClickToEdit onEdit={() => setEditing(id)}>
                    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-relaxed text-ink">
                      {bullets.filter((b) => b.trim()).map((b, i) => (
                        <li key={i}>
                          <Colored text={b} source={block?.was_optimized ? source : null} re={keywordRe} />
                        </li>
                      ))}
                    </ul>
                  </ClickToEdit>
                )}
                {lines.map((s) => (
                  <SuggestedLine key={s.id} s={s} draft={drafts[s.id]} onChange={(p) => setDraft(s.id, p)} re={keywordRe} />
                ))}
              </div>
            )
          })}
        </Section>

        <p className="text-center text-[12.5px] text-ink-muted">
          Want to change something else (name, education, certificates)?{' '}
          <Link href={`/package/${encodeURIComponent(packageId)}/edit`} className="font-semibold text-teal underline-offset-2 hover:underline">
            Open the full editor
          </Link>
        </p>
      </div>

      {/* Sticky score + save */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 shadow-m-2 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-2 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-ok">{NAMES.atsScore}</span>
              {before !== null ? <span className="font-mono text-[18px] text-ink-muted">{before}</span> : null}
              {before !== null && liveScore !== null ? <span aria-hidden="true" className="text-ink-muted">→</span> : null}
              {liveScore !== null ? <span className="font-mono text-[28px] font-bold leading-none text-ok">{liveScore}</span> : <span className="text-[13px] text-ink-muted">not available</span>}
              {band && liveScore !== null ? (
                <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', liveScore >= band[0] ? 'bg-ok-soft text-ok' : 'bg-gold-soft text-gold-ink')}>
                  {liveScore >= band[0] ? `Target ${band[0]}–${band[1]} reached` : `Target ${band[0]}–${band[1]}`}
                </span>
              ) : null}
            </div>
            <button type="button" onClick={() => void save()} disabled={saving} className={buttonVariants({ variant: 'primary' })}>
              {saving ? 'Saving…' : 'Save optimized CV'}
            </button>
          </div>
          {needsConfirm ? (
            <label className="flex min-h-11 items-start gap-2 text-[12.5px] text-ink">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-teal" />
              <span>
                I confirm the <strong>{kept.length} yellow item{kept.length === 1 ? '' : 's'}</strong> I kept are true for me and I can talk about them in an interview.
              </span>
            </label>
          ) : null}
          {saveError ? <p className="text-[12.5px] text-alert">{saveError}</p> : null}
        </div>
      </div>
    </main>
  )
}

function Section({ title, tone, accent, icon, children }: { title: string; tone: string; accent: string; icon: string; children: React.ReactNode }) {
  return (
    <section className={cn('flex flex-col gap-3 rounded-card border-2 bg-white p-4 shadow-m-1 sm:p-5', tone)}>
      <h2 className={cn('flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em]', accent)}>
        <span aria-hidden="true">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function ClickToEdit({ onEdit, children }: { onEdit: () => void; children: React.ReactNode }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onEdit()
      }}
      className="group relative cursor-text rounded-ctl border border-transparent p-2 hover:border-line hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
    >
      {children}
      <span className="absolute right-2 top-2 hidden rounded bg-white px-1.5 text-[11.5px] font-semibold text-teal group-hover:inline">Edit</span>
    </div>
  )
}

function EditBox({ value, rows, hint, onChange, onDone }: { value: string; rows: number; hint?: string; onChange: (v: string) => void; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <textarea autoFocus value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className="field text-[14px] leading-relaxed" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-ink-muted">{hint ?? ''}</span>
        <button type="button" onClick={onDone} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
          Done
        </button>
      </div>
    </div>
  )
}

function SuggestedLine({ s, draft, onChange, re }: { s: Suggestion; draft: Draft | undefined; onChange: (p: Partial<Draft>) => void; re: RegExp | null }) {
  const [edit, setEdit] = useState(false)
  const keep = !!draft?.keep
  const text = draft?.text ?? s.text
  return (
    <div className={cn('flex flex-col gap-2 rounded-ctl border p-3', keep ? 'border-gold bg-gold-soft' : 'border-dashed border-line-strong bg-white opacity-70')}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={keep}
          onChange={(e) => onChange({ keep: e.target.checked })}
          aria-label={`Keep suggested line for ${s.requirement}`}
          className="mt-1 size-4 accent-teal"
        />
        {edit ? (
          <textarea autoFocus value={text} rows={2} onChange={(e) => onChange({ text: e.target.value })} className="field flex-1 text-[14px]" />
        ) : (
          <p className={cn('flex-1 text-[14px] leading-relaxed text-ink', !keep && 'line-through')}>
            <Colored text={text} source={null} re={re} />
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pl-6">
        <span className="text-[12px] text-ink-muted">Suggested for the job requirement “{s.requirement}”</span>
        <button type="button" onClick={() => setEdit((v) => !v)} className="min-h-9 text-[12.5px] font-semibold text-teal underline-offset-2 hover:underline">
          {edit ? 'Done' : 'Edit wording'}
        </button>
      </div>
    </div>
  )
}

export default function OptimizePreviewPage(props: { params: Promise<{ packageId: string }> }) {
  const { packageId } = use(props.params)
  return (
    <Suspense>
      <PreviewInner packageId={packageId} />
    </Suspense>
  )
}
