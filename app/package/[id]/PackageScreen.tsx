'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { getTemplate, type TemplateId } from '@/lib/templates'
import { applyLivePhotoToDocument, applyTargetTitleToDocument, buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
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
import { GULF_COUNTRIES } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizedContent, Package, PackageServiceEvent, PackageStatus } from '@/types/package'
import { PreparationJourney } from '@/components/package/PreparationJourney'
import { ResultsOverview } from '@/components/package/ResultsOverview'
import { CTA, NAMES, USES } from '@/lib/serviceLabels'
import { StageSelect } from '@/components/package/StageSelect'
import { MatchResult, readMatchReport } from '@/components/optimizer/MatchResult'
import { SuggestionsPanel } from '@/components/optimizer/SuggestionsPanel'

const TIMELINE_FORMAT = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function toDateTimeInput(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function formatTimelineDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return TIMELINE_FORMAT.format(date)
}

function hasEvent(events: PackageServiceEvent[], type: PackageServiceEvent['type']): boolean {
  return events.some((event) => event.type === type)
}

function buildServiceTimeline(pkg: Package): PackageServiceEvent[] {
  const events = Array.isArray(pkg.service_events) ? [...pkg.service_events] : []
  const addDerived = (type: PackageServiceEvent['type'], at: string | null | undefined, label: string) => {
    if (!at || hasEvent(events, type)) return
    events.push({ id: `${type}-${at}`, type, at, label })
  }

  if (pkg.optimized_content) addDerived('cv_generated', pkg.updated_at ?? pkg.created_at, 'Optimized CV generated')
  const lastLetter = Array.isArray(pkg.cover_letters) ? pkg.cover_letters.at(-1) : null
  addDerived('cover_letter_generated', lastLetter?.generated_at, 'Cover letter generated')
  addDerived('qa_generated', pkg.interview_questions?.generated_at, 'Interview Q&A generated')
  const completedMock = pkg.mock_interview_runs
    ?.filter((run) => run.status === 'completed' && run.completed_at)
    .at(-1)
  addDerived('mock_interview_completed', completedMock?.completed_at, 'Mock interview report completed')

  return events
    .filter((event) => event.at && !Number.isNaN(new Date(event.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8)
}

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
  const [stageState, setStageState] = useState<string | null>(null)
  const [trackerDraft, setTrackerDraft] = useState({
    job_url: '',
    application_deadline: '',
    interview_date: '',
    application_notes: '',
  })
  const [trackerState, setTrackerState] = useState<string | null>(null)

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

  /**
   * Move this job along its pipeline, from the job's own page.
   *
   * A `packages` row is an application, and its stage was changeable only from
   * the list — so a user reading the CV they are about to send had to navigate
   * away to record that they had sent it. Same endpoint the list uses
   * (PUT /api/packages/[id]) and the same optimistic-then-reverted handling, so
   * a failed write never leaves the two screens disagreeing.
   */
  const saveStage = useCallback(
    async (next: PackageStatus) => {
      if (!pkg || pkg.status === next) return
      const prev = pkg.status
      setPkg((p) => (p ? { ...p, status: next } : p))
      setStageState(null)
      try {
        const res = await fetch(`/api/packages/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        })
        if (!res.ok) {
          setPkg((p) => (p ? { ...p, status: prev } : p))
          setStageState('Could not update the stage.')
        } else {
          const body = await res.json().catch(() => ({}))
          const updated = body?.package as Partial<Package> | undefined
          if (updated) setPkg((p) => (p ? { ...p, ...updated } : p))
        }
      } catch {
        setPkg((p) => (p ? { ...p, status: prev } : p))
        setStageState('Network error.')
      }
    },
    [id, pkg]
  )

  const saveTracker = useCallback(async () => {
    if (!pkg) return
    setTrackerState('Saving...')
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_url: trackerDraft.job_url,
          application_deadline: trackerDraft.application_deadline || null,
          interview_date: trackerDraft.interview_date
            ? new Date(trackerDraft.interview_date).toISOString()
            : null,
          application_notes: trackerDraft.application_notes,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setTrackerState((body?.error as string) ?? 'Could not save tracker.')
        return
      }
      const updated = body?.package as Partial<Package> | undefined
      setPkg((prev) => (prev ? { ...prev, ...(updated ?? {}) } : prev))
      setTrackerState('Saved')
      window.setTimeout(() => setTrackerState(null), 1800)
    } catch {
      setTrackerState('Network error.')
    }
  }, [id, pkg, trackerDraft])
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
        setTrackerDraft({
          job_url: p.job_url ?? '',
          application_deadline: p.application_deadline ?? '',
          interview_date: toDateTimeInput(p.interview_date),
          application_notes: p.application_notes ?? '',
        })
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

  // Coming back to this tab refreshes the service cards (2026-09-18): a cover
  // letter generated in another tab still showed "To do" here. Only service
  // fields are merged — never the name, tracker or style the user may be
  // editing on this page.
  useEffect(() => {
    let last = Date.now()
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 5000) return
      last = Date.now()
      fetch(`/api/packages/${encodeURIComponent(id)}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const fresh = data?.package as Package | undefined
          if (!fresh) return
          setPkg((prev) =>
            prev
              ? {
                  ...prev,
                  cover_letters: fresh.cover_letters,
                  interview_questions: fresh.interview_questions,
                  mock_interview_runs: fresh.mock_interview_runs,
                  ats_score_card: fresh.ats_score_card,
                  match_report: fresh.match_report,
                  service_events: fresh.service_events,
                  status: fresh.status,
                }
              : prev,
          )
        })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [id])

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-3 sm:px-5">
        <p className="text-sm text-alert">{error}</p>
      </div>
    )
  }

  if (!pkg) {
    // While checking is_paid we show nothing but a loader — never content.
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <PageSkeleton label="Loading your CV" />
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
  /**
   * The delivered document, with a photo uploaded after delivery filled in.
   * Kept beside `hasPhoto` above so the size control and the rendered photo
   * agree — before this they did not, which is how a document could offer a
   * photo-size slider while showing no photo at all.
   *
   * Not memoised on purpose: this runs after early returns, where a hook would
   * break the rules-of-hooks order, and it is one object spread.
   */
  const snapshotDocument = (pkg.document_snapshot as ResumeDocument | null) ?? null
  const documentWithLivePhoto = snapshotDocument
    ? applyTargetTitleToDocument(
        applyLivePhotoToDocument(
          snapshotDocument,
          profile?.photo_url ?? null,
          profile?.field_visibility ?? null,
        ),
        // Snapshots written before 2026-09-16 froze an empty headline. Filled
        // here so the screen shows what the PDF will print.
        pkg.target_job_title ?? null,
      )
    : null
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
          targetJobTitle: pkg.target_job_title ?? null,
        })
      : null)
  // Where the job is, in words — never the stored enum ("saudi_arabia").
  const countryName = pkg ? GULF_COUNTRIES.find((c) => c.value === pkg.target_country && c.value !== 'generic_gulf')?.label ?? null : null
  const pdfUrl = `/api/packages/${encodeURIComponent(id)}/pdf`
  // Word download is deliberately not offered yet (founder decision,
  // 2026-08-16). The .docx route still exists and still works — it is simply
  // not linked, because its layout does not match the on-screen resume and
  // shipping a download that disagrees with the preview is worse than not
  // shipping one. Re-link it once the generator mirrors the template.
  const cvReady = pkg.optimized_content != null
  const showOverview = !isFree && cvReady
  const letterReady = Array.isArray(pkg.cover_letters) && pkg.cover_letters.length > 0
  const qaReady = Boolean(pkg.interview_questions?.questions?.length)
  const mockReady = Boolean(pkg.mock_interview_runs?.some((run) => run.status === 'completed'))
  const serviceTimeline = buildServiceTimeline(pkg)
  const readyCount = Number(cvReady) + Number(letterReady) + Number(qaReady) + Number(mockReady)
  const nextJourneyStep = !cvReady
    ? {
        title: 'Optimize the CV for this target job',
        body: 'Start with the CV. The cover letter, interview Q&A and mock interview all use this optimized CV and target job.',
        cta: CTA.optimizeCv,
        href: pkg.is_paid ? `/optimize/generate/${encodeURIComponent(id)}` : `/optimize/pay/${encodeURIComponent(id)}`,
      }
    : !letterReady
      ? {
          title: NAMES.coverLetter,
          body: USES.coverLetter,
          cta: CTA.writeCoverLetter,
          href: `/cover-letter?package=${encodeURIComponent(id)}`,
        }
      : !qaReady
        ? {
            title: NAMES.interviewQa,
            body: USES.interviewQa,
            cta: CTA.prepareInterviewQa,
            href: `/interview-qa?package=${encodeURIComponent(id)}`,
          }
        : !mockReady
          ? {
              title: NAMES.mockInterview,
              body: USES.mockInterview,
              cta: CTA.startMockInterview,
              href: `/mock-interview?package=${encodeURIComponent(id)}`,
            }
          : {
              title: 'Application package complete',
              body: 'CV, cover letter, Q&A and mock report are ready. Track the recruiter response here.',
              cta: CTA.addTargetJob,
              href: '/optimize/target',
            }

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
    <main className="mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col bg-canvas font-redesign-sans">
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
        {/* THE JOB, NOT THE DOCUMENT (2026-09-23): this page is the workspace for
            one target job — its CV, letter, interview preparation and stage — so
            it is titled with the job. Never call a free resume "optimized" — it
            has not been through the model (docs/RULES.md). */}
        <div className="flex min-w-0 flex-col gap-0.5 lg:shrink-0">
          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal">Application workspace</span>
          <h1 className="break-words font-display text-[24px] leading-tight text-ink lg:text-[20px]">
            {pkg.name || pkg.target_job_title}
          </h1>
          <p className="text-[12.5px] text-ink-soft">
            {[
              pkg.target_company,
              countryName,
              isFree ? 'CV not optimized yet' : `${pkg.optimization_level.charAt(0).toUpperCase()}${pkg.optimization_level.slice(1)} optimized CV`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        {/* Rename, in place. A user with three attempts at the same role sees
            three identical rows in the Library otherwise — the target job
            title is not something they can change. Saves on blur or Enter;
            clearing it falls back to the job title rather than storing blank. */}
        <label className="flex flex-1 flex-wrap items-center gap-2 text-[12px] text-ink-muted lg:max-w-[420px]">
          <span className="sr-only lg:not-sr-only">Name in your library</span>
          {/* A textarea that sizes to its text (field-sizing: content), so a
              long job title wraps instead of being clipped mid-word on a phone
              ("…Enginee", 2026-09-18). Enter still saves; it never adds a line.
              Browsers without field-sizing keep a one-line box, as before. */}
          <textarea
            aria-label="Resume name"
            value={nameDraft}
            maxLength={120}
            rows={1}
            placeholder={pkg.target_job_title}
            onChange={(e) => setNameDraft(e.target.value.replace(/\n/g, ' '))}
            onBlur={() => void saveName()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            // The shared field, at 44px. It was 34px with a 1.21:1 edge.
            className="field min-w-[180px] flex-1 resize-none py-2.5 leading-snug"
          />
          {nameState ? <span className="shrink-0 text-teal">{nameState}</span> : null}
        </label>

        {/* The document's actions, pushed to the right of the same row.
            The stage control joins them rather than getting a band of its own:
            TASK-160 collapsed five stacked rows into this one specifically to
            give the A4 sheet its vertical room back, and a new full-width
            header would spend exactly what that bought. */}
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
          <StageSelect value={pkg.status} onChange={(next) => void saveStage(next)} />
          {stageState ? <span className="text-[12px] text-alert">{stageState}</span> : null}
          <a
            href={pdfUrl}
            onClick={() => setDownloaded(true)}
            className={buttonVariants({ variant: 'primary', size: 'sm' })}
          >
            {CTA.downloadPdf}
          </a>
          {/* EDIT ALWAYS OPENS THE SAME EDITOR NOW (2026-08-19, second pass).
              An earlier version sent a never-optimized resume to
              /optimize/generate first, reasoning it had no wording "of its
              own" to edit yet. The founder's answer: clicking Edit must open
              the editor, not spend a model call. It does not need to — the
              editor already derives its starting text the same way the resume
              itself renders (user_edited ?? generated ?? the profile's own,
              lib/resumeDocument.ts), and a hand edit saves the same way either
              case. So there is no branch left: every resume, optimized or not,
              goes straight to /package/[id]/edit.
              This deliberately does NOT open /optimize/preview/[id], which is
              the diff viewer ("here's what the optimizer changed") for a
              resume that HAS been optimized; that screen keeps its own job and
              its own route. */}
          <Link
            href={`/package/${encodeURIComponent(id)}/edit`}
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            {CTA.editCv}
          </Link>
          {/* THE DIFF, REACHABLE AGAIN (2026-09-12). Generation lands here, on
              the finished CV, so /optimize/preview — every changed line beside
              the original, the product's "nothing invented" made visible — had
              no link anywhere. Only for a resume the model actually wrote:
              otherwise there is no change to show. */}
          {!isFree ? (
            <Link
              href={`/optimize/preview/${encodeURIComponent(id)}`}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              {CTA.seeChanges}
            </Link>
          ) : null}
          {styleable && styleDirty ? (
            <>
              <span className="text-[12px] text-ink-muted">Unsaved</span>
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
            <span role="status" className="text-[12px] text-teal">
              {styleMsg}
            </span>
          ) : null}
        </div>
      </div>

      {/* NOT BUILT YET (2026-09-11). Founder report: a job whose CV build had
          failed opened as "Your CV, <name>" with a full resume under it — the
          Career Profile laid out as a CV — so it looked built while the
          Library said it was not. Say which it is, and give the one action that
          finishes it, routed the way the dashboard's next step routes it.
          Never on a free-tier resume: that one is meant to stay the profile's
          own, and offering a paid build there would be wrong. */}
      {pkg.optimized_content === null && (pkg as { tier?: string | null }).tier !== 'free' ? (
        <div className="mx-5 mb-3 flex flex-col gap-3 rounded-card border border-gold/40 bg-gold-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="text-[14px] font-bold text-ink">The CV for this job isn&apos;t optimized yet</p>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              What you see below is your Career Profile laid out as a CV. Optimize it to get the version
              written for {pkg.target_job_title}.
            </p>
          </div>
          <Link
            href={
              pkg.is_paid
                ? `/optimize/generate/${encodeURIComponent(id)}`
                : `/optimize/pay/${encodeURIComponent(id)}`
            }
            className={`${buttonVariants({ variant: 'primary', size: 'sm' })} shrink-0`}
          >
            {CTA.optimizeCv}
          </Link>
        </div>
      ) : null}

      <div className="px-5">
        <PreparationJourney pkg={pkg} current="resume" />
      </div>

      {/* Actions live in the header row now (TASK-160); the templates stay in the
          left rail beside the document (TASK-146). What remains here is the
          package journey plus transient notices, so the page explains what this
          job can become without adding backend state. */}
      <div className="flex w-full flex-col gap-4 px-5 pb-8 lg:gap-3">
        {/* RESULTS FIRST, AS COLOURED CARDS (founder request 2026-09-17): target
            job, ATS score before → after, summary, what changed, next steps.
            components/package/ResultsOverview.tsx. */}
        {showOverview ? (
          <ResultsOverview
            pkg={pkg}
            document={previewDocument}
            onScored={(body) =>
              setPkg((prev) =>
                prev
                  ? {
                      ...prev,
                      match_report: body.match_report,
                      optimized_content: prev.optimized_content
                        ? {
                            ...prev.optimized_content,
                            summary: {
                              ...prev.optimized_content.summary,
                              generated: prev.optimized_content.summary?.generated?.trim()
                                ? prev.optimized_content.summary.generated
                                : body.document_snapshot.summary,
                            },
                          }
                        : prev.optimized_content,
                      document_snapshot: {
                        ...body.document_snapshot,
                        header: {
                          ...body.document_snapshot.header,
                          photoUrl:
                            (prev.document_snapshot as ResumeDocument | null)?.header?.photoUrl ??
                            body.document_snapshot.header.photoUrl,
                        },
                      },
                    }
                  : prev,
              )
            }
          />
        ) : null}

        {/* Before -> after match score (docs/17_OPTIMIZER_ENGINE.md §5). Only
            on packages built by the optimizer engine; older ones have none. */}
        {(() => {
          const report = readMatchReport(pkg.match_report)
          if (!report?.after) return null
          const roleNames: Record<string, string> = {}
          for (const w of profile?.work_experience ?? []) roleNames[w.id] = `your role at ${w.company}`
          return (
            <>
              <details className="group rounded-card border border-line bg-white shadow-m-1">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-[14px] font-semibold text-ink">
                  <span>{NAMES.atsScore} details: score parts, why it fits, what is missing</span>
                  <span className="text-[13px] text-teal group-open:hidden">Show</span>
                  <span className="hidden text-[13px] text-teal group-open:inline">Hide</span>
                </summary>
                <div className="px-1 pb-1">
                  <MatchResult report={report} packageId={id} roleNames={roleNames} />
                </div>
              </details>
              <SuggestionsPanel
                report={report}
                roleNames={roleNames}
                onAction={async (actions) => {
                  const res = await fetch(`/api/packages/${encodeURIComponent(id)}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ suggestion_actions: actions }),
                  })
                  const body = await res.json().catch(() => ({}))
                  if (!res.ok) {
                    window.alert((body?.error as string) ?? 'Could not update this suggestion. Please try again.')
                    return
                  }
                  // The saved document and score come back; keep the photo as it was signed.
                  setPkg((prev) =>
                    prev
                      ? {
                          ...prev,
                          match_report: body.match_report ?? prev.match_report,
                          document_snapshot: body.document_snapshot
                            ? {
                                ...body.document_snapshot,
                                header: {
                                  ...body.document_snapshot.header,
                                  photoUrl: (prev.document_snapshot as ResumeDocument | null)?.header?.photoUrl ?? body.document_snapshot.header.photoUrl,
                                },
                              }
                            : prev.document_snapshot,
                        }
                      : prev,
                  )
                }}
              />
            </>
          )
        })()}

        {!showOverview ? (
        <section className="rounded-card border border-line bg-white p-3 shadow-m-1 sm:p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                Next steps for this job
              </p>
              <h2 className="font-display text-[18px] leading-tight text-ink">
                {pkg.name || pkg.target_job_title}
              </h2>
            </div>
            <p className="text-[12.5px] text-ink-soft">
              {[pkg.target_company, countryName].filter(Boolean).join(' · ') || 'Target job'}
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-3 rounded-ctl border border-teal/30 bg-teal-soft/50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal">
                Next step · {readyCount}/4 ready
              </p>
              <p className="mt-1 text-[14px] font-bold text-ink">{nextJourneyStep.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{nextJourneyStep.body}</p>
            </div>
            <Link
              href={nextJourneyStep.href}
              className={`${buttonVariants({ variant: readyCount === 4 ? 'secondary' : 'primary', size: 'sm' })} shrink-0`}
            >
              {nextJourneyStep.cta}
            </Link>
          </div>
        </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <div className="rounded-card border border-line bg-white p-4 shadow-m-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                  Application tracker
                </p>
                <h2 className="font-display text-[18px] leading-tight text-ink">Recruiter follow-up details</h2>
              </div>
              {trackerState ? <p className="text-[12px] font-semibold text-teal">{trackerState}</p> : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
                Job link
                <input
                  type="url"
                  value={trackerDraft.job_url}
                  onChange={(e) => setTrackerDraft((draft) => ({ ...draft, job_url: e.target.value }))}
                  placeholder="https://company.com/careers/role"
                  className="field font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
                Application deadline
                <input
                  type="date"
                  value={trackerDraft.application_deadline}
                  onChange={(e) =>
                    setTrackerDraft((draft) => ({ ...draft, application_deadline: e.target.value }))
                  }
                  className="field font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
                Interview date
                <input
                  type="datetime-local"
                  value={trackerDraft.interview_date}
                  onChange={(e) => setTrackerDraft((draft) => ({ ...draft, interview_date: e.target.value }))}
                  className="field font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft sm:row-span-2">
                Notes
                <textarea
                  value={trackerDraft.application_notes}
                  onChange={(e) =>
                    setTrackerDraft((draft) => ({ ...draft, application_notes: e.target.value }))
                  }
                  rows={4}
                  maxLength={3000}
                  placeholder="Recruiter name, salary range, visa notes, portal password reminder..."
                  className="field min-h-[112px] resize-y font-normal"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2 self-end">
                <button
                  type="button"
                  onClick={() => void saveTracker()}
                  className={buttonVariants({ variant: 'primary', size: 'sm' })}
                >
                  Save tracker
                </button>
                {pkg.job_url ? (
                  <a
                    href={pkg.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                  >
                    Open job link
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-card border border-line bg-white p-4 shadow-m-1">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">Service history</p>
            <h2 className="mt-1 font-display text-[18px] leading-tight text-ink">Package timeline</h2>
            <div className="mt-4 flex flex-col gap-3">
              {serviceTimeline.length > 0 ? (
                serviceTimeline.map((event) => (
                  <div key={event.id} className="grid grid-cols-[10px_minmax(0,1fr)] gap-3">
                    <span className="mt-1.5 size-2.5 rounded-full bg-teal ring-4 ring-teal-soft" />
                    <div>
                      <p className="text-[13px] font-semibold leading-snug text-ink">{event.label}</p>
                      <p className="mt-0.5 text-[12px] text-ink-muted">{formatTimelineDate(event.at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[13px] leading-relaxed text-ink-muted">
                  Activity for this application will appear here as you build and download each service.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Trying a template from the gallery. This must stay: a click in the
            gallery arrives as ?template= and renders immediately WITHOUT being
            saved, so the user needs an explicit way to keep or discard it —
            otherwise browsing would silently restyle a delivered resume
            (TASK-141). */}
        {isTrying ? (
          <div className="flex flex-col gap-2 rounded-card border border-teal/50 bg-teal-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-teal">
              Previewing <strong>{getTemplate(activeTemplateId).name}</strong>. Not saved yet — your
              download still uses <strong>{getTemplate(savedTemplateId).name}</strong>.
            </p>
            <span className="flex flex-wrap gap-2">
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

        {/* No duration: "next one takes a minute" was a timing claim of the
            kind removed everywhere on 2026-09-11. */}
        {downloaded && !isFree ? (
          <div className="rounded-card border border-teal/40 bg-teal-soft px-3.5 py-3 text-[13px] text-teal">
            Applying somewhere else? Your profile is saved — add the next job and it is reused.
          </div>
        ) : null}

        {/* The next things this job needs, from the job's own page. */}
        {!isFree && !showOverview && !(Array.isArray(pkg.cover_letters) && pkg.cover_letters.length > 0) ? (
          <div className="flex flex-col gap-2 rounded-card border border-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-ink-soft">
              <strong className="text-ink">Next for this job:</strong> a cover letter, written from your optimized CV
              and this target job.
            </p>
            <Link
              href={`/cover-letter?package=${encodeURIComponent(id)}`}
              className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} shrink-0`}
            >
              {CTA.writeCoverLetter}
            </Link>
          </div>
        ) : null}

        {!isFree && !showOverview && cvReady && !qaReady ? (
          <div className="flex flex-col gap-2 rounded-card border border-teal/30 bg-teal-soft/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-ink-soft">
              <strong className="text-ink">Interview prep:</strong> up to 25 practice answers from this
              optimized CV and target job.
            </p>
            <Link
              href={`/interview-qa?package=${encodeURIComponent(id)}`}
              className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} shrink-0`}
            >
              {CTA.prepareInterviewQa}
            </Link>
          </div>
        ) : null}

        {!isFree && !showOverview && cvReady && qaReady && !mockReady ? (
          <div className="flex flex-col gap-2 rounded-card border border-gold/40 bg-gold-soft/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-ink-soft">
              <strong className="text-ink">Practice next:</strong> run a text mock interview for this CV and save the final report.
            </p>
            <Link
              href={`/mock-interview?package=${encodeURIComponent(id)}`}
              className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} shrink-0`}
            >
              {CTA.startMockInterview}
            </Link>
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
              <div className="flex flex-col items-center rounded-card bg-gradient-to-b from-canvas to-canvas/60 p-3 ring-1 ring-line/70 sm:p-5 lg:p-5">
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
                    // A photo uploaded after delivery is filled in here for the
                    // same reason the PDF route does it: a snapshot frozen
                    // before the upload carries `photoUrl: null` and would
                    // never show one again. `profile.photo_url` is already a
                    // signed URL on this screen (GET /api/profile signs it),
                    // so it is passed straight through.
                    document={documentWithLivePhoto}
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
                <p className="mt-4 text-center text-[12px] text-ink-muted">
                  A4 · {getTemplate(activeTemplateId).name} · this is exactly what downloads as your
                  PDF.
                </p>
              </div>
            </section>
          ) : null}

          {previewDocument ? (
            <aside className="order-2 shrink-0 lg:order-1 lg:sticky lg:top-3 lg:max-h-[calc(100dvh-1.5rem)] lg:w-[260px] lg:overflow-y-auto">
              <div className="rounded-card border border-line bg-white p-4">
                <h2 className="font-display text-[17px] leading-tight text-ink">Templates</h2>
                <p className="mt-1 text-[12px] leading-snug text-ink-muted">
                  Your wording, dates and details stay exactly as they are — only the design
                  changes, and your PDF changes with it.
                </p>
                {templateError ? (
                  <p role="alert" className="mt-3 text-[12px] text-alert">
                    {templateError}
                  </p>
                ) : null}
                {/* ---- Text style (TASK-152) --------------------------------
                    Above the template list, because it applies to whichever
                    template is active and the user reaches for it after
                    choosing one, not before. */}
                <div className="mt-4 border-t border-line pt-4">
                  <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">
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
                        <span className="text-[12px] text-ink-muted">Colour</span>
                        {/* 36px swatches with room between them: they were
                            28px dots 6px apart, the smallest targets on the
                            screen, and a miss picks the neighbouring colour. */}
                        <div className="mt-1.5 flex flex-wrap gap-2.5">
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
                                  'size-9 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 ' +
                                  (active
                                    ? 'ring-2 ring-teal ring-offset-2'
                                    : 'ring-1 ring-line hover:ring-teal/60')
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
                          <label className="flex min-h-11 cursor-pointer items-center justify-between text-[12px] text-ink-muted">
                            <span className="text-ink-soft">Show photo</span>
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
                              className="size-5 cursor-pointer accent-teal"
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
                                className="flex items-baseline justify-between text-[12px] text-ink-muted"
                              >
                                <span>Photo size</span>
                                <span className="text-ink-soft">{photoPos}%</span>
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
                                className="mt-1.5 h-2 w-full cursor-pointer appearance-none rounded-full bg-canvas accent-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
                              />
                              <div className="mt-1 flex justify-between text-[12px] text-ink-muted">
                                <span>Smaller</span>
                                <span>50% = template default</span>
                                <span>Larger</span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {styleDirty ? (
                        <p className="mt-3 text-[12px] text-ink-muted">
                          Unsaved — use <strong className="text-ink-soft">Save style</strong> at the
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
                        <p className="mt-2 text-[12px] text-ink-muted">
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
                    <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
                      <strong className="text-ink-soft">{getTemplate(activeTemplateId).name}</strong>{' '}
                      keeps a fixed, colourless style on purpose — that is what maximum ATS
                      compatibility means. Pick any other template below for a photo, font, size and
                      colour choices.
                    </p>
                  )}
                </div>

                <div className="mt-4 border-t border-line pt-4">
                  <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-ink-soft">
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
      <span className="text-[12px] text-ink-muted">{label}</span>
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
                // 44px: the touch floor Button.tsx sets. These measured 32px.
                'min-h-11 rounded-ctl px-3 py-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1 ' +
                (active
                  ? 'bg-teal text-white'
                  : 'border border-line bg-white text-ink-soft hover:border-teal/60')
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

export function PackageScreen({ id }: { id: string }) {
  return (
    <Suspense>
      <PackageScreenInner id={id} />
    </Suspense>
  )
}
