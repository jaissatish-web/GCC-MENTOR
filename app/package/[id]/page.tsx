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
  PHOTO_DEFAULT,
  type AccentKey,
  type FontKey,
  type ResumeStyleOverrides,
  type SizeKey,
} from '@/lib/resumeStyle'
import { resumeKind } from '@/lib/resumeKind'
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
 * "Edit text" → this package's own editor (/package/[id]/edit, 2026-08-19 —
 * previously the diff viewer at /optimize/preview/[id], which still exists for
 * its own purpose). A repeat-purchase prompt appears after a download,
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
        // No payment gate while the locks are off (founder decision
        // 2026-08-17). This screen used to send an unpaid resume to /optimize/pay;
        // when the lock returns it must make the same decision as the PDF route,
        // never its own — see lib/resumeKind.ts.
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
  const photoPos = draftStyle.photo ?? PHOTO_DEFAULT
  /** Only offer the size control when there is actually a photo to size. */
  const hasPhoto = Boolean(
    (pkg.document_snapshot as ResumeDocument | null)?.header?.photoUrl ?? profile?.photo_url,
  )
  const tryingTemplateId = requestedTemplate ? getTemplate(requestedTemplate).id : null
  const isTrying = !!tryingTemplateId && tryingTemplateId !== savedTemplateId
  const activeTemplateId = isTrying ? (tryingTemplateId as TemplateId) : savedTemplateId
  const Template = getTemplate(activeTemplateId).component
  /**
   * No model-written text in this row, so it is the user's own profile in a
   * template. Drives the copy and where "Edit" goes. **Never access** — nothing
   * on this screen decides permission.
   */
  const isFree = resumeKind(pkg) === 'free'
  const styleable = getTemplate(activeTemplateId).styleable
  const allowsPhoto = getTemplate(activeTemplateId).allowsPhoto
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
      {/* ONE HEADER ROW (TASK-160, founder-directed).
          This was five stacked rows — back arrow, "Unlocked & saved to Library"
          badge, title, name field, then the action toolbar below — each one full
          width with empty space to its right, which spent well over 200px of
          vertical room to say very little. Title, rename and actions now share a
          single wrapping row across that width, so the document gets the height
          back.

          The arrow and the badge are gone outright, at the founder's call. The
          arrow duplicated the browser's own Back and the sidebar; the badge
          announced a state the user cannot be in any other way — an unpaid
          package never reaches this screen, it is redirected — so it was telling
          them something that is always true. */}
      <div className="flex flex-col gap-3 px-5 pb-3 pt-3 lg:shrink-0 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4 lg:gap-y-2">
        <h1 className="font-serif text-[24px] leading-tight text-ink-900 lg:shrink-0 lg:text-[20px]">
          {/* Never call a free resume "optimized" — it has not been through the
              model, and claiming otherwise is the one thing this product does not
              do (docs/RULES.md). */}
          {isFree ? `Your CV, ${firstName}` : `Your Gulf CV is ready, ${firstName}`}
        </h1>

        {/* Rename, in place. A user with three attempts at the same role sees
            three identical rows in the Library otherwise — the target job
            title is not something they can change. Saves on blur or Enter;
            clearing it falls back to the job title rather than storing blank. */}
        <label className="flex flex-1 flex-wrap items-center gap-2 text-[12px] text-ink-400 lg:max-w-[420px]">
          <span className="sr-only lg:not-sr-only">Name</span>
          <input
            type="text"
            aria-label="Resume name"
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
            className="min-w-[180px] flex-1 rounded-radius-md border border-line-light bg-surface-light px-3 py-1.5 text-[13px] text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          />
          {nameState ? <span className="shrink-0 text-forest">{nameState}</span> : null}
        </label>

        {/* The document's actions, pushed to the right of the same row. */}
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
          <a
            href={pdfUrl}
            onClick={() => setDownloaded(true)}
            className={buttonVariants({ variant: 'primary', size: 'sm' })}
          >
            Download PDF
          </a>
          {/* WHERE "EDIT" GOES DEPENDS ON WHAT THIS RESUME IS.
              A resume that has never been optimized has no wording of its own —
              it renders the live Career Profile — so there is nothing yet for a
              per-resume editor to open. That case runs generation first
              (2026-08-19, founder-directed change from the old behaviour, which
              sent it to /profile): /optimize/generate/[id] already reads every
              target field off the row and needs nothing new from here, and on
              success lands back on THIS page, where isFree flips to false and
              this same button becomes the editor below.
              Once generated, Edit opens /package/[id]/edit — the section-by-
              section editor with a live preview (2026-08-19). It deliberately
              does NOT open /optimize/preview/[id], which is the diff viewer
              ("here's what the optimizer changed"); that screen keeps its own
              job and its own route. */}
          <Link
            href={
              isFree
                ? `/optimize/generate/${encodeURIComponent(id)}`
                : `/package/${encodeURIComponent(id)}/edit`
            }
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            {isFree ? 'Optimize this resume' : 'Edit text'}
          </Link>
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Share to WhatsApp
          </a>
          {styleable && styleDirty ? (
            <>
              <span className="text-[11.5px] text-ink-400">Unsaved</span>
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
            </>
          ) : styleMsg ? (
            <span role="status" className="text-[11.5px] text-forest">
              {styleMsg}
            </span>
          ) : null}
        </div>
      </div>

      {/* Actions live in the header row now (TASK-160); the templates stay in the
          left rail beside the document (TASK-146). What remains here is the two
          transient notices, which only occupy height when they have something to
          say. */}
      <div className="flex w-full flex-col gap-4 px-5 pb-8 lg:gap-3">
        {/* Trying a template from the gallery. This must stay: a click in the
            gallery arrives as ?template= and renders immediately WITHOUT being
            saved, so the user needs an explicit way to keep or discard it —
            otherwise browsing would silently restyle a delivered resume
            (TASK-141). */}
        {isTrying ? (
          <div className="flex flex-col gap-2 rounded-radius-lg border border-forest/50 bg-forest-tint px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] text-forest">
              Previewing <strong>{getTemplate(activeTemplateId).name}</strong>. Not saved yet — your
              download still uses <strong>{getTemplate(savedTemplateId).name}</strong>.
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

        {/* The "optimize for a job" nudge block that used to sit here (shown on
            an un-optimized resume) was removed 2026-08-19 at the founder's
            request — /optimize/target is still reachable from the dashboard and
            the nav, so nothing is lost, just this in-page prompt. */}

        {downloaded && !isFree ? (
          <div className="rounded-radius-lg border border-forest/40 bg-forest-tint px-3.5 py-3 text-[12.5px] text-forest">
            Applying somewhere else? Your profile is saved — next one takes a minute.
          </div>
        ) : null}

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
                      {/* PHOTO — show/hide plus size, both TASK-158/2026-08-19.
                          Hidden entirely when the template prints no photo, or
                          the resume has none to show. A control that cannot
                          move is worse than an absent one. */}
                      {allowsPhoto && hasPhoto ? (
                        <div className="mt-4">
                          {/* SHOW PHOTO (2026-08-19, founder-directed). Only
                              `false` is ever stored — see ResumeStyleOverrides's
                              own doc — so unchecking writes `showPhoto: false`
                              and re-checking removes the key entirely rather
                              than writing `true`. */}
                          <label className="flex min-h-11 cursor-pointer items-center justify-between text-[11px] text-ink-400">
                            <span className="text-ink-700">Show photo</span>
                            <input
                              type="checkbox"
                              checked={draftStyle.showPhoto !== false}
                              onChange={(e) =>
                                setDraftStyle((st) => {
                                  const next = { ...st }
                                  if (e.target.checked) delete next.showPhoto
                                  else next.showPhoto = false
                                  return next
                                })
                              }
                              className="size-5 cursor-pointer accent-forest"
                            />
                          </label>

                          {/* PHOTO SIZE (TASK-158). A slider rather than named
                              steps because size is the one property where "a bit
                              bigger" is the actual request, and a number is safe
                              to accept: validated as an integer in range and only
                              ever multiplied into a pixel dimension, so unlike a
                              font name it has no route into arbitrary CSS.

                              Hidden while the photo itself is toggled off — a
                              size control for something invisible is confusing,
                              not merely redundant. */}
                          {draftStyle.showPhoto !== false ? (
                            <div className="mt-3">
                              <label
                                htmlFor="photo-size"
                                className="flex items-baseline justify-between text-[11px] text-ink-400"
                              >
                                <span>Photo size</span>
                                <span className="text-ink-700">{photoPos}%</span>
                              </label>
                              <input
                                id="photo-size"
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={photoPos}
                                onChange={(e) =>
                                  setDraftStyle((st) => ({ ...st, photo: Number(e.target.value) }))
                                }
                                className="mt-1.5 h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-2-light accent-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
                              />
                              <div className="mt-1 flex justify-between text-[10px] text-ink-400">
                                <span>Smaller</span>
                                <span>50% = template default</span>
                                <span>Larger</span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

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
                    // Honest rather than decorative (2026-08-19: now true of
                    // only ATS Classic — Gulf Premium gained its own controls).
                    // Its fixed, colourless, photo-less style IS the product:
                    // maximum ATS compatibility. A styling control — the photo
                    // especially — would work against the one thing this
                    // template sells, so it stays fixed on purpose.
                    <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
                      <strong className="text-ink-700">{getTemplate(activeTemplateId).name}</strong>{' '}
                      keeps a fixed, colourless style on purpose — that is what maximum ATS
                      compatibility means. Pick any other template below for a photo, font, size and
                      colour choices.
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
