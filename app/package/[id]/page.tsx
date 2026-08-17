'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { getTemplate, type TemplateId } from '@/lib/templates'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import { ResumeDocumentView } from '@/components/resume/ResumeDocumentView'
import { TemplatePicker } from '@/components/resume/TemplatePicker'
import {
  ACCENT_OPTIONS,
  FONT_OPTIONS,
  SIZE_OPTIONS,
  readStyleOverrides,
  type AccentKey,
  type FontKey,
  type ResumeStyleOverrides,
  type SizeKey,
} from '@/lib/resumeStyle'
import { buttonVariants } from '@/components/ui/Button'
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
  const searchParams = useSearchParams()
  const requestedTemplate = searchParams.get('template')
  const [pkg, setPkg] = useState<Package | null>(null)
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [switchingTo, setSwitchingTo] = useState<TemplateId | null>(null)
  const [templateError, setTemplateError] = useState<string | null>(null)
  /**
   * Style is edited live and saved explicitly (TASK-152).
   *
   * `draftStyle` drives the preview immediately so the user sees the change as
   * they pick it; nothing is written until Save. That distinction matters here
   * more than elsewhere in the app — this resume is a document the user has paid
   * for, and a picker that silently rewrote it on every click would be the same
   * mistake the template gallery avoided by previewing rather than applying.
   */
  const [draftStyle, setDraftStyle] = useState<ResumeStyleOverrides>({})
  const [savedStyle, setSavedStyle] = useState<ResumeStyleOverrides>({})
  const [styleBusy, setStyleBusy] = useState(false)
  const [styleMsg, setStyleMsg] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [nameState, setNameState] = useState<string | null>(null)

  /** Persist a template choice. Shared by the picker and the "trying" banner. */
  const applyTemplate = useCallback(
    async (nextId: TemplateId) => {
      if (switchingTo) return
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
        setPkg((prev) => (prev ? { ...prev, template_id: nextId } : prev))
        // Drop ?template= once it is the saved value — leaving it would keep
        // showing "not saved yet" for something that now is.
        router.replace(`/package/${encodeURIComponent(id)}`)
      } catch {
        setTemplateError('Network error. Please try again.')
      } finally {
        setSwitchingTo(null)
      }
    },
    [id, router, switchingTo],
  )

  /** Persist the style. Sends null when nothing is set, which is Reset. */
  const saveStyle = useCallback(
    async (next: ResumeStyleOverrides) => {
      setStyleBusy(true)
      setStyleMsg(null)
      try {
        const res = await fetch(`/api/packages/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            styleOverrides: Object.keys(next).length === 0 ? null : next,
          }),
        })
        if (!res.ok) {
          const bd = await res.json().catch(() => ({}))
          setStyleMsg((bd?.error as string) ?? 'Could not save the style.')
          return
        }
        setSavedStyle(next)
        setPkg((prev) => (prev ? { ...prev, style_overrides: next } : prev))
        setStyleMsg('Saved — your PDF will download with this style.')
        window.setTimeout(() => setStyleMsg(null), 2600)
      } catch {
        setStyleMsg('Network error. Could not save the style.')
      } finally {
        setStyleBusy(false)
      }
    },
    [id],
  )

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
        // readStyleOverrides, not a cast: the column is jsonb and a row could
        // hold anything a future bug writes. Unknown keys are dropped so the
        // controls open on a real state rather than a broken one.
        const style = readStyleOverrides((p as { style_overrides?: unknown }).style_overrides)
        setDraftStyle(style)
        setSavedStyle(style)
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

  /**
   * `?template=` arrives from the gallery: a template to TRY, not one that has
   * been applied. It renders immediately and offers to be kept, so a click in
   * the gallery can never silently restyle a resume the user already
   * delivered. Anything unknown falls back to the saved template.
   */
  const savedTemplateId = getTemplate((pkg as { template_id?: string | null }).template_id).id
  const styleDirty = JSON.stringify(draftStyle) !== JSON.stringify(savedStyle)
  const hasStyle = Object.keys(savedStyle).length > 0
  const tryingTemplateId = requestedTemplate ? getTemplate(requestedTemplate).id : null
  const isTrying = !!tryingTemplateId && tryingTemplateId !== savedTemplateId
  const activeTemplateId = isTrying ? (tryingTemplateId as TemplateId) : savedTemplateId
  const Template = getTemplate(activeTemplateId).component
  const styleable = getTemplate(activeTemplateId).styleable
  /**
   * The document the picker previews.
   *
   * Prefer the frozen snapshot, but FALL BACK to building it from the live
   * profile. Without this fallback the template rail is hidden on exactly the
   * resumes a real user would try it on: every package generated before
   * migration 034 has no snapshot, so `document_snapshot` is null and the rail
   * never renders. Reported by the founder against the old "Change template"
   * button as "I can't find the option anywhere" — it was there, and invisible
   * to everyone who already had resumes. The rail inherits the same fallback.
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
    // 1400px, widened from 1240 in TASK-146 to pay for the 260px template rail
    // while leaving the document column well clear of the template's own 794px
    // page. The rule this shell exists to protect, unchanged since TASK-129:
    // the A4 sheet must render at true size, never scaled down to make room
    // for chrome around it.
    /**
     * THREE INDEPENDENT SCROLL PANES ON DESKTOP (TASK-153, founder-directed).
     *
     * Before this the whole page scrolled as one, so dragging the scrollbar to
     * read the bottom of the resume also dragged the app nav and the template
     * rail off the top. On a laptop that is the wrong model for a document
     * editor: the tools should hold still while the document moves.
     *
     * So at `lg` the page is exactly one viewport tall and does not scroll at
     * all (`h-dvh overflow-hidden`). The header and toolbar are fixed rows, and
     * the two columns below each get their own `overflow-y-auto`. The nav rail
     * is pinned separately in Sidebar.tsx.
     *
     * `min-h-0` on every flex child in that chain is load-bearing: a flex item
     * defaults to `min-height: auto`, which refuses to shrink below its content,
     * and without it the columns grow to their full content height and the page
     * scrolls again — the exact bug this is fixing, silently reintroduced.
     *
     * Below `lg` nothing changes: a phone keeps one natural page scroll, because
     * nested scroll areas on a touch screen are how you lose the user.
     */
    <main className="mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col bg-bg font-redesign-sans">
      <div className="flex flex-col gap-3 px-5 pb-4 pt-1.5 lg:shrink-0 lg:gap-1.5 lg:pb-2">
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
        <h1 className="font-serif text-[27px] leading-tight text-ink-900 lg:text-[21px]">Your Gulf CV is ready, {firstName}</h1>

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

      {/* Actions ABOVE the document, templates BESIDE it (TASK-129 + TASK-146).
          The distinction is deliberate. The four actions are a toolbar: they
          are used once, so they earn a horizontal strip and no width. The ten
          templates are a browse-and-compare choice, which needs to stay on
          screen next to the thing it changes — so those get the left rail, and
          the rail is paid for by widening the shell rather than by squeezing
          the A4 page. */}
      <div className="flex w-full flex-col gap-4 px-5 pb-8 lg:gap-3">
        {/* Toolbar — sticks to the top of the viewport while scrolling a long
            CV, so Download is always one click away without costing any width. */}
        <div className="sticky top-0 z-20 flex flex-col gap-3 border-b border-line-light/60 bg-bg/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-bg/80 lg:py-2">
          {/*
            One button system, one size, one rhythm.
            These four controls were hand-styled with three different paddings,
            two text sizes and two focus-ring colours, which is what made the
            row read as unaligned. They now all come from buttonVariants at
            size="sm", so their heights and hit areas match by construction and
            cannot drift again. On a phone each is full-width and stacked —
            four 44px targets in a row do not fit 375px without shrinking below
            the touch-target floor.
          */}
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <a
              href={pdfUrl}
              onClick={() => setDownloaded(true)}
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              Download PDF
            </a>
            <Link
              href={`/optimize/preview/${encodeURIComponent(id)}`}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              Edit text
            </Link>
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              Share to WhatsApp
            </a>

            {/* SAVE SITS BESIDE DOWNLOAD (TASK-156, founder's call).
                It was at the bottom of the left rail, under the colour swatches
                — which meant the confirmation for a change you make on the left
                appeared nowhere near the button you press next. Save belongs with
                the other actions on this document. It appears only when there is
                something unsaved, so the row does not carry a permanently inert
                button, and `ml-auto` pushes it clear of the three navigation
                actions rather than sitting in the middle of them. */}
            {styleable && styleDirty ? (
              <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <span className="text-[11.5px] text-ink-400">Unsaved style change</span>
                <button
                  type="button"
                  disabled={styleBusy}
                  onClick={() => void saveStyle(draftStyle)}
                  className={buttonVariants({ variant: 'primary', size: 'sm' })}
                >
                  {styleBusy ? 'Saving…' : 'Save style'}
                </button>
                <button
                  type="button"
                  disabled={styleBusy}
                  onClick={() => setDraftStyle(savedStyle)}
                  className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                >
                  Undo
                </button>
              </span>
            ) : styleMsg ? (
              <span role="status" className="text-[11.5px] text-forest sm:ml-auto">
                {styleMsg}
              </span>
            ) : null}
          </div>
          {isTrying ? (
            <div className="flex flex-col gap-2 rounded-radius-lg border border-forest/50 bg-forest-tint px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12.5px] text-forest">
                Previewing <strong>{getTemplate(activeTemplateId).name}</strong>. Not saved yet —
                your download still uses{' '}
                <strong>{getTemplate(savedTemplateId).name}</strong>.
              </p>
              <span className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => void applyTemplate(activeTemplateId)}
                  disabled={!!switchingTo}
                  className={buttonVariants({ variant: 'primary', size: 'sm' })}
                >
                  {switchingTo ? 'Saving…' : 'Save this template'}
                </button>
                <button
                  type="button"
                  onClick={() => router.replace(`/package/${encodeURIComponent(id)}`)}
                  className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                >
                  Discard
                </button>
              </span>
            </div>
          ) : null}
          {downloaded ? (
            <div className="rounded-radius-lg border border-forest/40 bg-forest-tint px-3.5 py-3 text-[12.5px] text-forest">
              Applying somewhere else? Your profile is saved — next one takes a minute.
            </div>
          ) : null}
        </div>

        {/* TEMPLATES LEFT, DOCUMENT CENTRED (TASK-146, founder-directed).
            The templates used to hide behind a "Change template" toggle that
            pushed a four-across grid above the resume, so choosing a design
            meant losing sight of the thing being designed. They now sit in a
            persistent left rail and the document holds the centre, which is
            the arrangement every document editor uses for the same reason:
            the choices are peripheral, the page is the subject.

            The rail is 260px and the shell is 1400px, so the document column
            keeps ~1050px — comfortably more than the template's own 794px
            page. That was the constraint that killed the ORIGINAL two-column
            layout in TASK-129, where a 300px rail inside a 1240px shell left
            the A4 sheet scaled down; widening the shell is what makes a rail
            affordable again, and the sheet still renders at true size.

            Below lg it stacks: document first, templates under it. On a phone
            the resume is what you came to see, and a rail would push it off
            the first screen. */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
          {profile ? (
            <section className="order-1 min-w-0 flex-1 lg:order-2 lg:sticky lg:top-3 lg:max-h-[calc(100dvh-1.5rem)] lg:overflow-y-auto">
              {/* A page on a desk. The wrapper is flex-COL: it used to be a
                  plain `flex justify-center`, which made the caption below a
                  second flex ITEM sitting beside the sheet — so the resume was
                  pushed off-centre to the left with its caption stranded on the
                  right. That is the "not centred" the founder reported, and it
                  was a one-word layout bug, not a design decision. */}
              <div className="flex flex-col items-center rounded-radius-lg bg-gradient-to-b from-surface-2-light to-surface-2-light/60 p-3 ring-1 ring-line-light/70 sm:p-5 lg:p-5">
                {/* fitToHeight: show a WHOLE page, then scroll for the next one
                    (TASK-154). Without it the pane from TASK-153 showed roughly
                    half a page at true size. */}
                <ResumeDocumentView className="w-full max-w-[794px] rounded-[3px]">
                  {/* Registry lookup, not a hard-coded import: the screen must
                      show the same template the PDF and Word routes resolve, or
                      "what you see is what downloads" stops being true the
                      moment a second template exists. */}
                  <Template
                    // The delivered document wins over the live profile — see
                    // migration 034. Without this the on-screen resume silently
                    // changes whenever the Career Profile is edited, including
                    // for resumes already paid for.
                    document={(pkg.document_snapshot as ResumeDocument | null) ?? null}
                    profile={profile}
                    optimizedContent={(pkg.optimized_content ?? {
                      summary: { generated: '', source_profile_summary: '' },
                      experience_blocks: [],
                    }) as OptimizedContent}
                    skillsOrder={pkg.skills_order ?? []}
                    fieldVisibility={pkg.field_visibility_snapshot ?? null}
                    // The DRAFT, not the saved value — the point of the panel is
                    // that the change is visible before it is committed.
                    styleOverrides={draftStyle}
                  />
                </ResumeDocumentView>
                <p className="mt-4 text-center text-[11.5px] text-ink-400">
                  A4 · {getTemplate(activeTemplateId).name} · this is exactly what downloads as your
                  PDF.
                </p>
              </div>
            </section>
          ) : null}

          {previewDocument ? (
            <aside className="order-2 shrink-0 lg:order-1 lg:sticky lg:top-3 lg:max-h-[calc(100dvh-1.5rem)] lg:w-[260px] lg:overflow-y-auto">
              <div className="rounded-radius-lg border border-line-light bg-surface-light p-4">
                <h2 className="font-serif text-[17px] leading-tight text-ink-900">Templates</h2>
                <p className="mt-1 text-[11.5px] leading-snug text-ink-400">
                  Your wording, dates and details stay exactly as they are — only the design
                  changes, and your PDF changes with it.
                </p>
                {templateError ? (
                  <p role="alert" className="mt-3 text-[12px] text-terra">
                    {templateError}
                  </p>
                ) : null}
                {/* ---- Text style (TASK-152) --------------------------------
                    Above the template list, because it applies to whichever
                    template is active and the user reaches for it after
                    choosing one, not before. */}
                <div className="mt-4 border-t border-line-light pt-4">
                  <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-700">
                    Text style
                  </h3>
                  {styleable ? (
                    <>
                      <StyleChoice
                        label="Font"
                        options={Object.entries(FONT_OPTIONS).map(([k, v]) => [k, v.label])}
                        value={draftStyle.font ?? ''}
                        onChange={(v) =>
                          setDraftStyle((s) => ({ ...s, font: (v || undefined) as FontKey | undefined }))
                        }
                      />
                      <StyleChoice
                        label="Size"
                        options={Object.entries(SIZE_OPTIONS).map(([k, v]) => [k, v.label])}
                        value={draftStyle.size ?? ''}
                        onChange={(v) =>
                          setDraftStyle((s) => ({ ...s, size: (v || undefined) as SizeKey | undefined }))
                        }
                      />
                      <div className="mt-3">
                        <span className="text-[11px] text-ink-400">Colour</span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {Object.entries(ACCENT_OPTIONS).map(([k, v]) => {
                            const active = draftStyle.accent === k
                            return (
                              <button
                                key={k}
                                type="button"
                                title={v.label}
                                aria-label={v.label}
                                aria-pressed={active}
                                onClick={() =>
                                  setDraftStyle((s) => ({
                                    ...s,
                                    accent: active ? undefined : (k as AccentKey),
                                  }))
                                }
                                style={{ background: v.hex }}
                                className={
                                  'size-7 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 ' +
                                  (active
                                    ? 'ring-2 ring-forest ring-offset-2'
                                    : 'ring-1 ring-line-light hover:ring-forest/60')
                                }
                              />
                            )
                          })}
                        </div>
                      </div>

                      {/* Save/Undo moved up beside Download PDF (TASK-156). Only
                          Reset stays here, because it belongs with the controls it
                          clears rather than with the document's actions. */}
                      {styleDirty ? (
                        <p className="mt-3 text-[11.5px] text-ink-400">
                          Unsaved — use <strong className="text-ink-700">Save style</strong> at the
                          top.
                        </p>
                      ) : hasStyle ? (
                        <button
                          type="button"
                          disabled={styleBusy}
                          onClick={() => {
                            setDraftStyle({})
                            void saveStyle({})
                          }}
                          className={'mt-3 ' + buttonVariants({ variant: 'ghost', size: 'sm' })}
                        >
                          Reset to template default
                        </button>
                      ) : (
                        <p className="mt-2 text-[11px] text-ink-400">
                          Using the template&apos;s own style.
                        </p>
                      )}
                    </>
                  ) : (
                    // Honest rather than decorative: these two templates are
                    // hand-written with a fixed face and size on every element,
                    // so a control here would do nothing. Say which templates
                    // do support it instead of greying out four dead pickers.
                    <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
                      <strong className="text-ink-700">{getTemplate(activeTemplateId).name}</strong>{' '}
                      has a fixed style that cannot be adjusted. Pick any other template below to
                      change the font, size and colour.
                    </p>
                  )}
                </div>

                <div className="mt-4 border-t border-line-light pt-4">
                  <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-ink-700">
                    Template
                  </h3>
                  <TemplatePicker
                    layout="rail"
                    document={previewDocument}
                    current={activeTemplateId}
                    busyId={switchingTo}
                    onSelect={(nextId) => {
                      if (nextId === activeTemplateId) return
                      void applyTemplate(nextId)
                    }}
                  />
                </div>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </main>
  )
}

/**
 * A labelled row of mutually exclusive choices, with "Default" always present.
 *
 * Real buttons with aria-pressed rather than a <select>: there are three options
 * and the choice is visual, so showing them all beats opening a dropdown to read
 * three words. "Default" is an option rather than a separate reset control, so
 * going back to the template's own style is the same gesture as picking one.
 */
function StyleChoice({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: [string, string][]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="mt-3">
      <span className="text-[11px] text-ink-400">{label}</span>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {([['', 'Default'], ...options] as [string, string][]).map(([k, lbl]) => {
          const active = value === k
          return (
            <button
              key={k || 'default'}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(k)}
              className={
                'min-h-8 rounded-radius-md px-2.5 py-1 text-[11.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-1 ' +
                (active
                  ? 'bg-forest text-white'
                  : 'border border-line-light bg-surface-light text-ink-700 hover:border-forest/60')
              }
            >
              {lbl}
            </button>
          )
        })}
      </div>
    </div>
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
