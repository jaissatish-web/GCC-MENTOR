'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { getTemplate, type TemplateId } from '@/lib/templates'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import { ResumeDocumentView } from '@/components/resume/ResumeDocumentView'
import { TemplatePicker } from '@/components/resume/TemplatePicker'
import { AppShell } from '@/components/layout/AppShell'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizedContent, Package } from '@/types/package'

/**
 * Results & download — screen 10 (TASK-033), route /package/[id].
 *
 * POST-payment results screen. SECURITY: if `is_paid` is false when this loads
 * (someone navigated here directly without paying), we redirect to
 * /optimize/pay/[id] and show nothing — the real deliverable is NEVER rendered
 * for an unpaid load.
 *
 * When paid: renders the paid user's OWN full resume inline via the single
 * template (GulfPremium) and offers the actions from Step 10: Download PDF
 * (the is_paid-gated GET /api/packages/[id]/pdf; the parallel /docx route
 * exists but is deliberately unlinked — see the note at docxUrl's old site),
 * Share to WhatsApp (a wa.me link, no backend), and
 * "Edit text" → back to the Changes tab of this package
 * (/optimize/preview/[id]). A repeat-purchase prompt appears after a download,
 * per docs/DASHBOARD_LIBRARY.md: "Applying somewhere else? Your profile is
 * saved — next one takes a minute."
 */

function PackageScreenInner({ id }: { id: string }) {
  const router = useRouter()
  const [pkg, setPkg] = useState<Package | null>(null)
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [switchingTo, setSwitchingTo] = useState<TemplateId | null>(null)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [nameState, setNameState] = useState<string | null>(null)

  // Saves only when the value actually changed, so tabbing through the field
  // does not fire a pointless write on a paid resume.
  const saveName = useCallback(async () => {
    const current = (pkg?.name as string | null) ?? ''
    const next = nameDraft.trim()
    if (!pkg || next === current.trim()) return
    setNameState('Saving…')
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: next }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setNameState((b?.error as string) ?? 'Could not save the name.')
        return
      }
      setPkg((prev) => (prev ? { ...prev, name: next || null } : prev))
      setNameState('Saved')
      window.setTimeout(() => setNameState(null), 1600)
    } catch {
      setNameState('Network error.')
    }
  }, [id, nameDraft, pkg])
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    Promise.all([
      fetch(`/api/packages/${encodeURIComponent(id)}`, { cache: 'no-store' }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch('/api/profile', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([pkgData, profileData]) => {
        const p = pkgData?.package as Package | undefined
        if (!p) {
          setError('Package not found.')
          return
        }
        // Security gate: never show the real deliverable to an unpaid load.
        if (!p.is_paid) {
          router.replace(`/optimize/pay/${encodeURIComponent(id)}`)
          return
        }
        setPkg(p)
        setNameDraft(((p as { name?: string | null }).name ?? '') as string)
        setProfile(profileData as CareerProfileFull | null)
      })
      .catch(() => setError('Could not load this package.'))
  }, [id, router])

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
        <p className="text-sm text-terra">{error}</p>
      </div>
    )
  }

  if (!pkg) {
    // While checking is_paid we show nothing but a loader — never content.
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <p className="font-mono text-sm text-ink-400">Loading…</p>
      </div>
    )
  }

  const activeTemplateId = getTemplate((pkg as { template_id?: string | null }).template_id).id
  const Template = getTemplate(activeTemplateId).component
  /**
   * The document the picker previews.
   *
   * Prefer the frozen snapshot, but FALL BACK to building it from the live
   * profile. Without this fallback the "Change template" button was hidden on
   * exactly the resumes a real user would try it on: every package generated
   * before migration 034 has no snapshot, so `document_snapshot` is null and
   * the button never rendered. Reported by the founder as "I can't find the
   * option anywhere" — it was there, and invisible to everyone who already
   * had resumes.
   */
  const previewDocument: ResumeDocument | null =
    (pkg.document_snapshot as ResumeDocument | null) ??
    (profile
      ? buildResumeDocument({
          profile,
          optimizedContent: (pkg.optimized_content ?? {
            summary: { generated: '', source_profile_summary: '' },
            experience_blocks: [],
          }) as OptimizedContent,
          skillsOrder: pkg.skills_order ?? [],
          fieldVisibility: pkg.field_visibility_snapshot ?? null,
        })
      : null)
  const firstName = profile ? profile.full_name.trim().split(/\s+/)[0] || 'there' : 'there'
  const pdfUrl = `/api/packages/${encodeURIComponent(id)}/pdf`
  // Word download is deliberately not offered yet (founder decision,
  // 2026-08-16). The .docx route still exists and still works — it is simply
  // not linked, because its layout does not match the on-screen resume and
  // shipping a download that disagrees with the preview is worse than not
  // shipping one. Re-link it once the generator mirrors the template.
  const whatsappText = encodeURIComponent(`Here is my optimized Gulf CV: ${pkg.target_job_title}`)
  const waUrl = `https://wa.me/?text=${whatsappText}`

  return (
    // Wider than the old max-w-5xl: at 1024px, minus a 300px action rail and
    // padding, the document column was narrower than the template's own 794px
    // page, so the resume was being scaled down harder than it needed to be —
    // or, before ResumeDocumentView existed, clipped outright.
    <main className="mx-auto flex min-h-dvh w-full max-w-[1240px] flex-col bg-bg font-redesign-sans">
      <div className="flex flex-col gap-3 px-5 pb-4 pt-1.5">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-radius-md text-[20px] leading-none text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2"
        >
          ←
        </button>

        <span className="self-start rounded-[5px] bg-forest-tint px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-forest">
          ✓ Unlocked &amp; saved to Library
        </span>
        <h1 className="font-serif text-[27px] leading-tight text-ink-900">Your Gulf CV is ready, {firstName}</h1>

        {/* Rename, in place. A user with three attempts at the same role sees
            three identical rows in the Library otherwise — the target job
            title is not something they can change. Saves on blur or Enter;
            clearing it falls back to the job title rather than storing blank. */}
        <label className="flex flex-wrap items-center gap-2 text-[12px] text-ink-400">
          <span>Resume name</span>
          <input
            type="text"
            value={nameDraft}
            maxLength={120}
            placeholder={pkg.target_job_title}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => void saveName()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
            className="min-w-[220px] flex-1 rounded-radius-md border border-line-light bg-surface-light px-3 py-2 text-[13px] text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          />
          {nameState ? <span className="text-forest">{nameState}</span> : null}
        </label>
      </div>

      {/* Single column, actions ABOVE the document.
          The previous lg two-column layout spent a fixed 300px of every desktop
          screen on four buttons, which left the A4 page (794px) scaled down
          inside whatever remained. Moving the actions to a horizontal toolbar
          gives the page the full 1240px, so the resume renders at its true size
          and is simply read top to bottom, the way a document is. */}
      <div className="flex w-full flex-col gap-4 px-5 pb-8">
        {/* Toolbar — sticks to the top of the viewport while scrolling a long
            CV, so Download is always one click away without costing any width. */}
        <div className="sticky top-0 z-20 flex flex-col gap-3 border-b border-line-light/60 bg-bg/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={pdfUrl}
              onClick={() => setDownloaded(true)}
              className="inline-flex min-h-11 flex-1 items-center justify-center sm:flex-none rounded-radius-md bg-surface-light px-4 py-3 text-[12.5px] font-bold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2"
            >
              Download PDF
            </a>
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 flex-1 items-center justify-center sm:flex-none rounded-radius-md border border-line-light/70 bg-surface-light px-4 py-3 text-[12.5px] font-semibold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2"
            >
              Share to WhatsApp
            </a>
            <Link
              href={`/optimize/preview/${encodeURIComponent(id)}`}
              className="inline-flex min-h-11 flex-1 items-center justify-center sm:flex-none rounded-radius-md border border-line-light/70 bg-surface-light px-4 py-3 text-[12.5px] font-semibold text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
            >
              Edit text
            </Link>
            {previewDocument ? (
              <button
                type="button"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((v) => !v)}
                className="inline-flex min-h-11 flex-1 items-center justify-center sm:flex-none rounded-radius-md border border-line-light/70 bg-surface-light px-4 py-3 text-[12.5px] font-semibold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
              >
                {pickerOpen ? 'Close templates' : 'Change template'}
              </button>
            ) : null}
          </div>
          {pickerOpen && previewDocument ? (
            <div className="rounded-radius-lg border border-line-light bg-surface-2-light p-4">
              <p className="mb-3 text-[12.5px] text-ink-700">
                Pick a look. Your wording, dates and details stay exactly as they are — only the
                design changes, and your PDF changes with it.
              </p>
              {templateError ? (
                <p role="alert" className="mb-3 text-[12px] text-terra">
                  {templateError}
                </p>
              ) : null}
              <TemplatePicker
                document={previewDocument}
                current={activeTemplateId}
                busyId={switchingTo}
                onSelect={async (nextId) => {
                  if (nextId === activeTemplateId || switchingTo) return
                  setSwitchingTo(nextId)
                  setTemplateError(null)
                  try {
                    const res = await fetch(`/api/packages/${encodeURIComponent(id)}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ templateId: nextId }),
                    })
                    if (!res.ok) {
                      const b = await res.json().catch(() => ({}))
                      setTemplateError((b?.error as string) ?? 'Could not change the template.')
                      return
                    }
                    // Update in place rather than reloading: the document is
                    // unchanged, so only the renderer needs to swap.
                    setPkg((prev) => (prev ? { ...prev, template_id: nextId } : prev))
                  } catch {
                    setTemplateError('Network error. Please try again.')
                  } finally {
                    setSwitchingTo(null)
                  }
                }}
              />
            </div>
          ) : null}
          {downloaded ? (
            <div className="rounded-radius-lg border border-forest/40 bg-forest-tint px-3.5 py-3 text-[12.5px] text-forest">
              Applying somewhere else? Your profile is saved — next one takes a minute.
            </div>
          ) : null}
        </div>

        {/* The document itself: a page on a desk. Capped at the template's own
            794px and centred, so a wide screen shows the sheet at true size
            rather than a stretched one, and a narrow screen scales it down
            instead of clipping it. */}
        {profile ? (
          <div className="rounded-radius-lg bg-surface-2-light p-3 sm:p-5">
            <ResumeDocumentView className="mx-auto w-full max-w-[794px]">
              {/* Registry lookup, not a hard-coded import: the screen must show
                  the same template the PDF and Word routes resolve, or "what
                  you see is what downloads" stops being true the moment a
                  second template exists. */}
              <Template
                // The delivered document wins over the live profile — see
                // migration 034. Without this the on-screen resume silently
                // changes whenever the Career Profile is edited, including for
                // resumes already paid for.
                document={(pkg.document_snapshot as ResumeDocument | null) ?? null}
                profile={profile}
                optimizedContent={(pkg.optimized_content ?? {
                  summary: { generated: '', source_profile_summary: '' },
                  experience_blocks: [],
                }) as OptimizedContent}
                skillsOrder={pkg.skills_order ?? []}
                fieldVisibility={pkg.field_visibility_snapshot ?? null}
              />
            </ResumeDocumentView>
            <p className="mt-3 text-center text-[11.5px] text-ink-400">
              This is exactly what downloads as your PDF.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default function PackagePage({ params }: { params: { id: string } }) {
  const id = params.id
  return (
    <AppShell>
      <Suspense>
        <PackageScreenInner id={id} />
      </Suspense>
    </AppShell>
  )
}
