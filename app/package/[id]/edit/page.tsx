'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { buttonVariants } from '@/components/ui/Button'
import { ResumeDocumentView } from '@/components/resume/ResumeDocumentView'
import { getTemplate } from '@/lib/templates'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import { readStyleOverrides } from '@/lib/resumeStyle'
import { cn } from '@/lib/utils'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizedContent, Package } from '@/types/package'

/**
 * Edit this resume — route /package/[id]/edit (2026-08-19, founder-directed).
 *
 * WHY THIS EXISTS SEPARATELY FROM /optimize/preview/[packageId]. That screen is
 * a *diff viewer* — "here's what the optimizer changed" — with editing bolted
 * on: before/after panels, strike-through, "+N JD terms" counters, and one
 * inline textarea at a time. It answers "what did the AI do to my CV?", which
 * is a different question from "let me rewrite my CV". The founder asked for a
 * page where the resume is edited part by part, visually, against the document
 * itself. That is this page; the diff screen keeps its own job.
 *
 * WORKS ON ANY RESUME, OPTIMIZED OR NOT (2026-08-19, second pass). An earlier
 * version bounced a never-optimized resume to /optimize/generate first, on the
 * reasoning that it had no wording "of its own" to edit. The founder's answer:
 * clicking Edit must open the editor, not spend a model call. It does not need
 * to — lib/resumeDocument.ts already resolves text as
 * `user_edited ?? generated ?? the profile's own`, so a hand edit saved as
 * `user_edited` is honoured whether or not the model ever ran. Both cases are
 * therefore driven off the RENDERED DOCUMENT below rather than off
 * optimized_content, which is what makes them one code path instead of two.
 *
 * WHAT IS EDITABLE, AND WHY ONLY THIS. Exactly the two things that are this
 * RESUME's own words: the professional summary and each experience entry's
 * bullets. Everything else on the CV — name, contact, employers, roles, dates,
 * education, certifications, skills — is a FIXED FIELD read from the profile
 * and frozen into document_snapshot at generation (migration 034,
 * docs/08_RESUME_ENGINE.md §4). Those are edited on the Career Profile, where
 * they actually live, and deliberately are not editable per-resume: a resume is
 * a presentation of profile facts, not a second place to state them. This page
 * says so plainly rather than showing dead inputs.
 *
 * SAVE IS EXPLICIT AND BATCHED, unlike the diff screen's save-per-field. The
 * user edits several sections and presses Save once; that is one PATCH
 * (/api/packages/[id]) carrying every changed section, which is also the only
 * shape that keeps document_snapshot consistent in a single read-modify-write.
 * Leaving with unsaved work warns rather than silently discarding it — the
 * exact defect recorded against the profile editor in open items §B5.
 *
 * THE LIVE PREVIEW IS THE REAL TEMPLATE, not an approximation: the same
 * component the PDF route renders, fed a document with the in-progress edits
 * applied. "What you see is what downloads" has to survive editing too.
 */

interface Draft {
  summary: string
  /** Keyed by profile_experience_id -> that entry's bullets, in order. */
  bullets: Record<string, string[]>
}

const EMPTY_CONTENT: OptimizedContent = {
  summary: { generated: '', source_profile_summary: '' },
  experience_blocks: [],
}

function EditResumeInner({ packageId }: { packageId: string }) {
  const router = useRouter()
  const [pkg, setPkg] = useState<Package | null>(null)
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  /** The resume as it stands on the server — the baseline the editor starts from. */
  const [baseDoc, setBaseDoc] = useState<ResumeDocument | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saved, setSaved] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    Promise.all([
      fetch(`/api/packages/${encodeURIComponent(packageId)}`, { cache: 'no-store' }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch('/api/profile', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([pkgData, profileData]) => {
        if (!pkgData?.package) {
          setError('Resume not found.')
          return
        }
        const p = pkgData.package as Package
        const prof = (profileData as CareerProfileFull | null) ?? null

        // Prefer the frozen delivered document; otherwise build it from the live
        // profile, exactly as the resume screen and the PDF route do. Either way
        // this already has the user_edited ?? generated ?? profile precedence
        // resolved, so the editor starts from what the user actually sees.
        const base =
          (p.document_snapshot as ResumeDocument | null) ??
          (prof
            ? buildResumeDocument({
                profile: prof,
                optimizedContent: (p.optimized_content as OptimizedContent | null) ?? EMPTY_CONTENT,
                skillsOrder: p.skills_order ?? [],
                fieldVisibility: p.field_visibility_snapshot ?? null,
              })
            : null)

        if (!base) {
          setError('Could not load this resume. Please try again.')
          return
        }

        const initial: Draft = {
          summary: base.summary,
          bullets: Object.fromEntries(base.experience.map((i) => [i.entry.id, [...i.bullets]])),
        }
        setPkg(p)
        setProfile(prof)
        setBaseDoc(base)
        setDraft(initial)
        setSaved(initial)
      })
      .catch(() => setError('Could not load this resume.'))
  }, [packageId])

  const dirty = useMemo(
    () => (draft && saved ? JSON.stringify(draft) !== JSON.stringify(saved) : false),
    [draft, saved],
  )

  // Warn before losing unsaved edits — open items §B5 is the same defect on the
  // profile editor, and repeating it on a delivered document would be worse.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  /** The document as it would render RIGHT NOW, edits included. */
  const previewDocument: ResumeDocument | null = useMemo(() => {
    if (!baseDoc || !draft) return null
    return {
      ...baseDoc,
      summary: draft.summary,
      experience: baseDoc.experience.map((item) => {
        const edited = draft.bullets[item.entry.id]
        return edited ? { ...item, bullets: edited } : item
      }),
    }
  }, [baseDoc, draft])

  const save = useCallback(async () => {
    if (!pkg || !draft) return
    setSaveBusy(true)
    setError(null)
    setJustSaved(false)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(packageId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: { user_edited: draft.summary },
          experience_blocks: Object.entries(draft.bullets).map(([id, list]) => ({
            profile_experience_id: id,
            // Blank lines are dropped rather than persisted: an empty bullet
            // renders as a stray dot on the printed CV.
            user_edited_bullets: list.map((b) => b.trim()).filter(Boolean),
          })),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body?.error as string) ?? 'Could not save your changes. Please try again.')
        return
      }
      // Move the baseline to what was just written, so the preview and the
      // dirty check agree with the server without a refetch.
      setBaseDoc((prev) =>
        prev
          ? {
              ...prev,
              summary: draft.summary,
              experience: prev.experience.map((item) => {
                const edited = draft.bullets[item.entry.id]
                return edited ? { ...item, bullets: edited } : item
              }),
            }
          : prev,
      )
      setSaved(draft)
      setJustSaved(true)
    } catch {
      setError('Network error. Could not save your changes.')
    } finally {
      setSaveBusy(false)
    }
  }, [pkg, draft, packageId])

  const backToResume = () => router.push(`/package/${encodeURIComponent(packageId)}`)

  if (error && !pkg) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg px-5">
        <div className="text-center">
          <p className="text-sm text-terra">{error}</p>
          <Link
            href="/dashboard/library"
            className={cn('mt-4 inline-block', buttonVariants({ variant: 'secondary', size: 'sm' }))}
          >
            Back to your Library
          </Link>
        </div>
      </main>
    )
  }

  if (!pkg || !draft || !baseDoc) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg">
        <p className="font-mono text-sm text-ink-400">Loading…</p>
      </main>
    )
  }

  const Template = getTemplate((pkg as { template_id?: string | null }).template_id).component
  const styleOverrides = readStyleOverrides((pkg as { style_overrides?: unknown }).style_overrides)

  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 py-6 sm:px-8 font-redesign-sans">
      {/* Header — the save state lives here, next to the action that clears it */}
      <div className="flex flex-col gap-3 border-b border-line-light pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-[24px] leading-tight text-ink-900">Edit your resume</h1>
          <p className="text-[12.5px] text-ink-400">
            Rewrite any part below. The preview updates as you type; nothing is saved until you
            press Save.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? (
            <span className="text-[11.5px] font-semibold text-gold-text">Unsaved changes</span>
          ) : null}
          {justSaved && !dirty ? (
            <span className="text-[11.5px] font-semibold text-forest">Saved</span>
          ) : null}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saveBusy || !dirty}
            className={cn(
              buttonVariants({ variant: 'primary', size: 'sm' }),
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
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
        <p
          role="alert"
          className="mt-4 rounded-radius-md border border-terra/40 bg-terra-tint px-3.5 py-3 text-[12.5px] text-terra"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ---- The editor ---- */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Professional summary */}
          <section className="rounded-radius-lg border border-line-light bg-surface-light p-5">
            <h2 className="text-[13px] font-bold text-ink-900">Professional summary</h2>
            <p className="mt-1 text-[11.5px] text-ink-400">The opening paragraph of your CV.</p>
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft((d) => (d ? { ...d, summary: e.target.value } : d))}
              rows={6}
              aria-label="Professional summary"
              className="mt-3 w-full resize-y rounded-radius-md border border-line-light bg-surface-2-light/40 p-3 text-[13px] leading-relaxed text-ink-900 outline-none focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/25"
            />
          </section>

          {/* One card per experience entry ON THE DOCUMENT — so the editor shows
              exactly the entries the CV shows, in the same order, whether they
              came from the optimizer or straight from the profile. */}
          {baseDoc.experience.map((item) => {
            const id = item.entry.id
            const list = draft.bullets[id] ?? []
            const setList = (next: string[]) =>
              setDraft((d) => (d ? { ...d, bullets: { ...d.bullets, [id]: next } } : d))
            return (
              <section key={id} className="rounded-radius-lg border border-line-light bg-surface-light p-5">
                <h2 className="text-[13px] font-bold text-ink-900">
                  {item.entry.role || 'Experience'}
                  {item.entry.company ? (
                    <span className="font-normal text-ink-400"> · {item.entry.company}</span>
                  ) : null}
                </h2>
                <p className="mt-1 text-[11.5px] text-ink-400">
                  {list.length} {list.length === 1 ? 'bullet' : 'bullets'}
                  {item.range ? ` · ${item.range}` : ''} — the role, employer and dates come from
                  your Career Profile.
                </p>

                <div className="mt-3 flex flex-col gap-2">
                  {list.map((bullet, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span aria-hidden className="pt-2.5 text-[13px] text-ink-400">
                        •
                      </span>
                      <textarea
                        value={bullet}
                        onChange={(e) => setList(list.map((b, j) => (j === i ? e.target.value : b)))}
                        rows={2}
                        aria-label={`Bullet ${i + 1}`}
                        className="min-w-0 flex-1 resize-y rounded-radius-md border border-line-light bg-surface-2-light/40 p-2.5 text-[12.5px] leading-relaxed text-ink-900 outline-none focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/25"
                      />
                      <button
                        type="button"
                        onClick={() => setList(list.filter((_, j) => j !== i))}
                        aria-label={`Remove bullet ${i + 1}`}
                        title="Remove this bullet"
                        className="mt-1 shrink-0 rounded-radius-md px-2 py-1.5 text-[12px] font-semibold text-ink-400 transition-colors hover:bg-terra-tint hover:text-terra focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {list.length === 0 ? (
                    <p className="text-[11.5px] text-ink-400">
                      No bullets yet — add one to describe this role.
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setList([...list, ''])}
                  className={cn('mt-3', buttonVariants({ variant: 'secondary', size: 'sm' }))}
                >
                  Add a bullet
                </button>
              </section>
            )
          })}

          {/* What is deliberately not editable here, said plainly rather than
              shown as inputs that refuse to work. */}
          <section className="rounded-radius-lg border border-line-light bg-surface-2-light/40 p-5">
            <h2 className="text-[13px] font-bold text-ink-900">Everything else</h2>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-400">
              Your name, contact details, employers, job titles, dates, education, certifications
              and skills are the same on every resume, so they are edited once in your Career
              Profile rather than per resume.
            </p>
            <Link
              href="/profile"
              className={cn('mt-3 inline-block', buttonVariants({ variant: 'secondary', size: 'sm' }))}
            >
              Open Career Profile
            </Link>
          </section>
        </div>

        {/* ---- Live preview: the real template, with edits applied ---- */}
        {previewDocument ? (
          <aside className="shrink-0 lg:sticky lg:top-4 lg:w-[420px]">
            <div className="rounded-radius-lg border border-line-light bg-surface-light p-4">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-ink-700">
                Live preview
              </h2>
              <p className="mt-1 text-[11px] text-ink-400">
                Exactly what your PDF will contain once you save.
              </p>
              <ResumeDocumentView className="mt-3 w-full rounded-[3px]">
                <Template
                  document={previewDocument}
                  profile={profile as CareerProfileFull}
                  optimizedContent={
                    (pkg.optimized_content as OptimizedContent | null) ?? EMPTY_CONTENT
                  }
                  skillsOrder={pkg.skills_order ?? []}
                  fieldVisibility={pkg.field_visibility_snapshot ?? null}
                  styleOverrides={styleOverrides}
                />
              </ResumeDocumentView>
            </div>
          </aside>
        ) : null}
      </div>
    </main>
  )
}

export default function EditResumePage({ params }: { params: { id: string } }) {
  // No sidebar / mobile nav here on purpose (2026-08-19, founder-directed):
  // this screen holds an in-progress, easy-to-lose edit, and a nav rail is an
  // invitation to tap away from it. "Back to resume" above is the one way out,
  // and it warns first when there is unsaved work — see EditResumeInner. The
  // nav returns the moment the user is back on /package/[id].
  return (
    <AppShell hideNav>
      <Suspense>
        <EditResumeInner packageId={params.id} />
      </Suspense>
    </AppShell>
  )
}
