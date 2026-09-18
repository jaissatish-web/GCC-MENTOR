'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, use } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { buttonVariants } from '@/components/ui/Button'
import { ResumeDocumentView } from '@/components/resume/ResumeDocumentView'
import { getTemplate } from '@/lib/templates'
import { buildResumeDocument, type ResumeContactItem, type ResumeDocument } from '@/lib/resumeDocument'
import { CONTACT_KIND_LABELS, withSyncedIdentity } from '@/lib/resumeEdits'
import { readStyleOverrides } from '@/lib/resumeStyle'
import { cn } from '@/lib/utils'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizedContent, Package } from '@/types/package'

/**
 * Edit this resume — route /package/[id]/edit.
 *
 * EVERY FIELD IS EDITABLE, FOR THIS RESUME ONLY (2026-09-17, founder decision;
 * replaces the 2026-08-19 "summary and bullets only" rule). Name, headline,
 * contact details, each role's title / company / dates / activities, skills,
 * certifications, education and additional information. A user may call a role
 * "Senior Engineer" on one application without rewriting their master Career
 * Profile, which this screen never changes.
 *
 * The draft IS the resume document (lib/resumeDocument.ts). Save sends it once
 * (PATCH /api/packages/[id] { document }); the server sanitises it
 * (lib/resumeEdits.ts), stores it as the delivered document, mirrors summary and
 * activities into optimized_content, and re-scores the job match. PDF, DOCX,
 * cover letter, interview Q&A and mock interview all read that document, so the
 * edit is what every service uses.
 *
 * THE LIVE PREVIEW IS THE REAL TEMPLATE, fed the in-progress draft. Leaving with
 * unsaved work warns first.
 */

const EMPTY_CONTENT: OptimizedContent = {
  summary: { generated: '', source_profile_summary: '' },
  experience_blocks: [],
}

let tempSeq = 0
const tempId = (prefix: string) => `${prefix}-new-${Date.now().toString(36)}-${(tempSeq++).toString(36)}`

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const smallBtn =
  'flex size-9 shrink-0 items-center justify-center rounded-ctl text-[13px] font-semibold text-ink-muted transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-30'
const removeBtn =
  'flex size-9 shrink-0 items-center justify-center rounded-ctl text-[13px] font-semibold text-ink-muted transition-colors hover:bg-alert-soft hover:text-alert focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert'

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-white p-5">
      <h2 className="text-[13px] font-bold text-ink">{title}</h2>
      {hint ? <p className="mt-1 text-[12px] text-ink-muted">{hint}</p> : null}
      <div className="mt-3 flex flex-col gap-2.5">{children}</div>
    </section>
  )
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">
      {label}
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="field font-normal" />
    </label>
  )
}

/** A reorderable list of single-line text rows (bullets, skills, certifications…). */
function RowList({
  items,
  onChange,
  addLabel,
  multiline = false,
  itemLabel,
}: {
  items: string[]
  onChange: (next: string[]) => void
  addLabel: string
  multiline?: boolean
  itemLabel: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((value, i) => (
        <div key={i} className="flex items-start gap-1.5">
          {multiline ? (
            <textarea
              value={value}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              rows={Math.max(2, Math.ceil(value.length / 48))}
              aria-label={`${itemLabel} ${i + 1}`}
              className="field min-w-0 flex-1 p-2.5"
            />
          ) : (
            <input
              value={value}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              aria-label={`${itemLabel} ${i + 1}`}
              className="field min-w-0 flex-1"
            />
          )}
          <button type="button" className={smallBtn} disabled={i === 0} onClick={() => onChange(move(items, i, i - 1))} aria-label={`Move ${itemLabel} ${i + 1} up`}>
            ↑
          </button>
          <button type="button" className={smallBtn} disabled={i === items.length - 1} onClick={() => onChange(move(items, i, i + 1))} aria-label={`Move ${itemLabel} ${i + 1} down`}>
            ↓
          </button>
          <button type="button" className={removeBtn} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove ${itemLabel} ${i + 1}`}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ''])} className={cn('self-start', buttonVariants({ variant: 'secondary', size: 'sm' }))}>
        {addLabel}
      </button>
    </div>
  )
}

function EditResumeInner({ packageId }: { packageId: string }) {
  const router = useRouter()
  const [pkg, setPkg] = useState<Package | null>(null)
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [draft, setDraft] = useState<ResumeDocument | null>(null)
  const [saved, setSaved] = useState<ResumeDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [justSaved, setJustSaved] = useState<string | null>(null)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    Promise.all([
      fetch(`/api/packages/${encodeURIComponent(packageId)}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/profile', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([pkgData, profileData]) => {
        if (!pkgData?.package) {
          setError('Resume not found.')
          return
        }
        const p = pkgData.package as Package
        const prof = (profileData as CareerProfileFull | null) ?? null
        const base =
          (p.document_snapshot as ResumeDocument | null) ??
          (prof
            ? buildResumeDocument({
                profile: prof,
                optimizedContent: (p.optimized_content as OptimizedContent | null) ?? EMPTY_CONTENT,
                skillsOrder: p.skills_order ?? [],
                fieldVisibility: p.field_visibility_snapshot ?? null,
                targetJobTitle: p.target_job_title ?? null,
              })
            : null)
        if (!base) {
          setError('Could not load this resume. Please try again.')
          return
        }
        setPkg(p)
        setProfile(prof)
        setDraft(base)
        setSaved(base)
      })
      .catch(() => setError('Could not load this resume.'))
  }, [packageId])

  const dirty = useMemo(() => (draft && saved ? JSON.stringify(draft) !== JSON.stringify(saved) : false), [draft, saved])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const update = useCallback((fn: (d: ResumeDocument) => ResumeDocument) => {
    setJustSaved(null)
    setDraft((d) => (d ? withSyncedIdentity(fn(d)) : d))
  }, [])

  const save = useCallback(async () => {
    if (!draft) return
    setSaveBusy(true)
    setError(null)
    setJustSaved(null)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(packageId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: draft }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((body?.error as string) ?? 'Could not save your changes. Please try again.')
        return
      }
      setSaved(draft)
      const after = body?.match_report?.after?.total
      setJustSaved(typeof after === 'number' ? `Saved · job match now ${after}` : 'Saved')
    } catch {
      setError('Network error. Could not save your changes.')
    } finally {
      setSaveBusy(false)
    }
  }, [draft, packageId])

  const backToResume = () => router.push(`/package/${encodeURIComponent(packageId)}`)

  if (error && !pkg) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-3 sm:px-5">
        <p className="text-sm text-alert">{error}</p>
      </main>
    )
  }
  if (!pkg || !draft) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas">
        <PageSkeleton label="Loading the editor" />
      </main>
    )
  }

  const Template = getTemplate((pkg as { template_id?: string | null }).template_id).component
  const styleOverrides = readStyleOverrides((pkg as { style_overrides?: unknown }).style_overrides)
  const hasItems = Array.isArray(draft.header.contactItems)
  const contactItems = draft.header.contactItems ?? []
  const setContact = (next: ResumeContactItem[]) => update((d) => ({ ...d, header: { ...d.header, contactItems: next } }))
  const usedKinds = new Set(contactItems.map((c) => c.kind))
  const freeKinds = (Object.keys(CONTACT_KIND_LABELS) as ResumeContactItem['kind'][]).filter((k) => !usedKinds.has(k))

  return (
    <main className="mx-auto w-full max-w-[1400px] px-3 py-6 font-redesign-sans sm:px-8">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[24px] leading-tight text-ink">Edit your resume</h1>
          <p className="text-[13px] text-ink-muted">
            Change any part of this resume. Changes apply to <strong className="text-ink">this resume only</strong> — your
            Career Profile stays as it is. Nothing is saved until you press Save.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? <span className="text-[12px] font-semibold text-teal">Unsaved changes</span> : null}
          {justSaved && !dirty ? <span className="text-[12px] font-semibold text-teal">{justSaved}</span> : null}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saveBusy || !dirty}
            className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'disabled:cursor-not-allowed disabled:opacity-50')}
          >
            {saveBusy ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return
              backToResume()
            }}
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            Back to resume
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-ctl border border-alert/40 bg-alert-soft px-3.5 py-3 text-[13px] text-alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* ---- Header ---- */}
          <Section title="Name, headline and contact">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <TextField label="Name" value={draft.header.displayName} onChange={(v) => update((d) => ({ ...d, header: { ...d.header, displayName: v } }))} />
              <TextField label="Headline (job title)" value={draft.header.targetJobTitle} onChange={(v) => update((d) => ({ ...d, header: { ...d.header, targetJobTitle: v } }))} />
            </div>
            {hasItems ? (
              <div className="flex flex-col gap-2">
                {contactItems.map((c, i) => (
                  <div key={`${c.kind}-${i}`} className="flex items-center gap-1.5">
                    <span className="w-[110px] shrink-0 text-[12px] font-semibold text-ink-soft">{CONTACT_KIND_LABELS[c.kind]}</span>
                    <input
                      value={c.text}
                      onChange={(e) => setContact(contactItems.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                      aria-label={CONTACT_KIND_LABELS[c.kind]}
                      className="field min-w-0 flex-1"
                    />
                    <button type="button" className={removeBtn} onClick={() => setContact(contactItems.filter((_, j) => j !== i))} aria-label={`Remove ${CONTACT_KIND_LABELS[c.kind]}`}>
                      ✕
                    </button>
                  </div>
                ))}
                {freeKinds.length > 0 ? (
                  <select
                    value=""
                    aria-label="Add a contact detail"
                    onChange={(e) => {
                      const kind = e.target.value as ResumeContactItem['kind']
                      if (kind) setContact([...contactItems, { kind, text: '' }])
                    }}
                    className="field self-start text-[13px]"
                  >
                    <option value="">+ Add a contact detail…</option>
                    {freeKinds.map((k) => (
                      <option key={k} value={k}>
                        {CONTACT_KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ) : (
              <>
                <TextField label="Identity line (nationality · location · visa)" value={draft.header.identityPrimary} onChange={(v) => update((d) => ({ ...d, header: { ...d.header, identityPrimary: v } }))} />
                <TextField label="Contact line (phone · email · LinkedIn)" value={draft.header.identityContact} onChange={(v) => update((d) => ({ ...d, header: { ...d.header, identityContact: v } }))} />
                <TextField label="Other details (date of birth · passport · notice)" value={draft.header.identityGulf} onChange={(v) => update((d) => ({ ...d, header: { ...d.header, identityGulf: v } }))} />
              </>
            )}
          </Section>

          {/* ---- Summary ---- */}
          <Section title="Professional summary" hint="The opening paragraph of your CV.">
            <textarea
              value={draft.summary}
              onChange={(e) => update((d) => ({ ...d, summary: e.target.value }))}
              rows={Math.max(6, Math.ceil(draft.summary.length / 60))}
              aria-label="Professional summary"
              className="field"
            />
          </Section>

          {/* ---- Experience ---- */}
          <Section title="Work experience" hint="Job title, company, dates and activities for each role, in the order shown on the CV.">
            {draft.experience.map((item, i) => {
              const setItem = (fn: (x: typeof item) => typeof item) =>
                update((d) => ({ ...d, experience: d.experience.map((x, j) => (j === i ? fn(x) : x)) }))
              return (
                <div key={item.entry.id} className="flex flex-col gap-2.5 rounded-ctl border border-line bg-canvas/40 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Role {i + 1}</span>
                    <span className="flex gap-1">
                      <button type="button" className={smallBtn} disabled={i === 0} onClick={() => update((d) => ({ ...d, experience: move(d.experience, i, i - 1) }))} aria-label={`Move role ${i + 1} up`}>
                        ↑
                      </button>
                      <button type="button" className={smallBtn} disabled={i === draft.experience.length - 1} onClick={() => update((d) => ({ ...d, experience: move(d.experience, i, i + 1) }))} aria-label={`Move role ${i + 1} down`}>
                        ↓
                      </button>
                      <button
                        type="button"
                        className={removeBtn}
                        onClick={() => {
                          if (window.confirm('Remove this role from this resume?')) update((d) => ({ ...d, experience: d.experience.filter((_, j) => j !== i) }))
                        }}
                        aria-label={`Remove role ${i + 1}`}
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <TextField label="Job title" value={item.entry.role ?? ''} onChange={(v) => setItem((x) => ({ ...x, entry: { ...x.entry, role: v } }))} />
                    <TextField label="Dates" placeholder="Mar 2019 — Present" value={item.range} onChange={(v) => setItem((x) => ({ ...x, range: v }))} />
                  </div>
                  <TextField label="Company and location" placeholder="Company · City, Country" value={item.companyLine} onChange={(v) => setItem((x) => ({ ...x, companyLine: v, entry: { ...x.entry, company: v.split(' · ')[0] ?? v } }))} />
                  <div className="text-[12px] font-semibold text-ink-soft">Activities</div>
                  <RowList items={item.bullets} onChange={(next) => setItem((x) => ({ ...x, bullets: next }))} addLabel="Add an activity" multiline itemLabel="Activity" />
                </div>
              )
            })}
            <button
              type="button"
              onClick={() =>
                update((d) => ({
                  ...d,
                  experience: [
                    ...d.experience,
                    {
                      entry: { id: tempId('role'), role: '', company: '', sort_order: d.experience.length } as ResumeDocument['experience'][number]['entry'],
                      bullets: [''],
                      range: '',
                      companyLine: '',
                    },
                  ],
                }))
              }
              className={cn('self-start', buttonVariants({ variant: 'secondary', size: 'sm' }))}
            >
              Add a role
            </button>
          </Section>

          {/* ---- Skills ---- */}
          <Section title="Skills" hint="Add, remove or reorder. The first skills are the ones a recruiter reads first.">
            <RowList
              items={draft.skills.map((s) => s.name)}
              itemLabel="Skill"
              addLabel="Add a skill"
              onChange={(names) =>
                update((d) => ({
                  ...d,
                  skills: names.map((name, i) => {
                    const prior = d.skills.find((s) => s.name === name)
                    return prior ? { ...prior, name, sort_order: i } : { id: tempId('skill'), profile_id: '', name, sort_order: i, created_at: '' }
                  }),
                }))
              }
            />
          </Section>

          {/* ---- Certifications ---- */}
          <Section title="Certifications">
            <RowList
              items={draft.certifications.map((c) => c.display)}
              itemLabel="Certification"
              addLabel="Add a certification"
              onChange={(lines) =>
                update((d) => ({
                  ...d,
                  certifications: lines.map((display, i) => ({
                    entry: (d.certifications[i]?.entry ?? { id: tempId('cert') }) as ResumeDocument['certifications'][number]['entry'],
                    display,
                  })),
                }))
              }
            />
          </Section>

          {/* ---- Education ---- */}
          <Section title="Education">
            {draft.education.map((ed, i) => (
              <div key={ed.entry.id} className="flex items-end gap-1.5">
                <div className="grid min-w-0 flex-1 gap-2.5 sm:grid-cols-[1fr_140px]">
                  <TextField label="Qualification and institution" value={ed.line} onChange={(v) => update((d) => ({ ...d, education: d.education.map((x, j) => (j === i ? { ...x, line: v } : x)) }))} />
                  <TextField label="Years" placeholder="2012—2016" value={ed.years} onChange={(v) => update((d) => ({ ...d, education: d.education.map((x, j) => (j === i ? { ...x, years: v } : x)) }))} />
                </div>
                <button type="button" className={removeBtn} onClick={() => update((d) => ({ ...d, education: d.education.filter((_, j) => j !== i) }))} aria-label={`Remove education ${i + 1}`}>
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                update((d) => ({
                  ...d,
                  education: [...d.education, { entry: { id: tempId('edu') } as ResumeDocument['education'][number]['entry'], line: '', years: '' }],
                }))
              }
              className={cn('self-start', buttonVariants({ variant: 'secondary', size: 'sm' }))}
            >
              Add education
            </button>
          </Section>

          {/* ---- Additional information ---- */}
          <Section title="Additional information" hint="Languages, memberships, awards — one per line.">
            <RowList
              items={draft.additional.map((a) => a.display)}
              itemLabel="Item"
              addLabel="Add an item"
              onChange={(lines) =>
                update((d) => ({
                  ...d,
                  additional: lines.map((display, i) => ({
                    entry: (d.additional[i]?.entry ?? { id: tempId('info') }) as ResumeDocument['additional'][number]['entry'],
                    display,
                  })),
                }))
              }
            />
          </Section>
        </div>

        {/* ---- Live preview ---- */}
        <aside className="shrink-0 lg:sticky lg:top-4 lg:w-[420px]">
          <div className="rounded-card border border-line bg-white p-4">
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">Live preview</h2>
            <p className="mt-1 text-[12px] text-ink-muted">Exactly what your PDF will contain once you save.</p>
            <ResumeDocumentView className="mt-3 w-full rounded-[3px]">
              <Template
                document={draft}
                profile={profile as CareerProfileFull}
                optimizedContent={(pkg.optimized_content as OptimizedContent | null) ?? EMPTY_CONTENT}
                skillsOrder={pkg.skills_order ?? []}
                fieldVisibility={pkg.field_visibility_snapshot ?? null}
                styleOverrides={styleOverrides}
              />
            </ResumeDocumentView>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default function EditResumePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  // No sidebar here on purpose: this screen holds an easy-to-lose edit. "Back to
  // resume" is the one way out, and it warns when there is unsaved work.
  return (
    <AppShell hideNav>
      <Suspense>
        <EditResumeInner packageId={params.id} />
      </Suspense>
    </AppShell>
  )
}
