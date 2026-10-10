'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'

import {
  ArrowTrendingUpIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  MinusIcon,
  PlusIcon,
  Squares2X2Icon,
  SwatchIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { PreparationJourney } from '@/components/package/PreparationJourney'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { getTemplate, type TemplateId } from '@/lib/templates'
import { applyLivePhotoToDocument, applyTargetTitleToDocument, buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import { ResumeDocumentView } from '@/components/resume/ResumeDocumentView'
import { TemplatePicker } from '@/components/resume/TemplatePicker'
import { PhotoUpload } from '@/components/profile/PhotoUpload'
import {
  ACCENT_OPTIONS,
  FONT_OPTIONS,
  HEADER_OPTIONS,
  HIGHLIGHT_OPTIONS,
  INK_OPTIONS,
  SIZE_OPTIONS,
  readStyleOverrides,
  PHOTO_DEFAULT,
  type AccentKey,
  type FontKey,
  type HeaderKey,
  type HighlightKey,
  type InkKey,
  type ResumeStyleOverrides,
  type SizeKey,
} from '@/lib/resumeStyle'
import { buildCareerProfileResume, isCareerProfileResume, CAREER_RESUME_BADGE } from '@/lib/careerProfileResume'
import { resumeKind } from '@/lib/resumeKind'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizedContent, Package, PackageServiceEvent, PackageStatus } from '@/types/package'
import { ResultsOverview } from '@/components/package/ResultsOverview'
import { CTA, NAMES, USES } from '@/lib/serviceLabels'
import { StageSelect } from '@/components/package/StageSelect'
import { needsClaimReview, CLAIM_REVIEW_MESSAGE } from '@/lib/optimizer/claimReview'
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

type WorkspaceTab = 'overview' | 'improve' | 'design' | 'tracker'

/**
 * The workspace's four views, as a segmented control (founder 2026-10-04).
 *
 * They were underlined text links, which on a phone read as a line of words
 * rather than four places to go. Now four equal buttons in one box, each with
 * an icon; the open one is filled teal. Same four views, same `?tab=` links.
 * On a phone the icon sits above a short word so all four fit one 350px row.
 */
const TAB_ICONS: Record<WorkspaceTab, React.ComponentType<{ className?: string }>> = {
  overview: Squares2X2Icon,
  improve: ArrowTrendingUpIcon,
  design: SwatchIcon,
  tracker: ClipboardDocumentListIcon,
}

function WorkspaceTabs({
  tab,
  onChange,
  improveCount,
}: {
  tab: WorkspaceTab
  onChange: (t: WorkspaceTab) => void
  improveCount: number
}) {
  const items: Array<{ key: WorkspaceTab; label: string; short: string; badge?: number }> = [
    { key: 'overview', label: 'Overview', short: 'Overview' },
    { key: 'improve', label: 'Improve score', short: 'Improve', badge: improveCount || undefined },
    { key: 'design', label: 'CV design', short: 'Design' },
    { key: 'tracker', label: 'Tracker', short: 'Tracker' },
  ]
  return (
    <div role="tablist" aria-label="Job workspace" className="grid grid-cols-4 gap-1 rounded-card border border-line bg-white p-1 shadow-m-1">
      {items.map((it) => {
        const active = tab === it.key
        const Icon = TAB_ICONS[it.key]
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className={cn(
              'relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-ctl px-1 py-1.5 text-[13px] font-bold leading-tight transition-colors sm:min-h-11 sm:flex-row sm:gap-2 sm:px-3 sm:text-[14px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1',
              active ? 'bg-teal text-white shadow-m-1' : 'text-ink-soft hover:bg-teal-soft hover:text-teal',
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="sm:hidden">{it.short}</span>
            <span className="hidden sm:inline">{it.label}</span>
            {it.badge ? (
              <span
                className={cn(
                  'absolute right-1 top-1 min-w-5 rounded-full px-1.5 text-center text-[12px] font-bold leading-5 sm:static sm:leading-normal sm:py-0.5',
                  active ? 'bg-white text-teal' : 'bg-gold-soft text-gold-ink',
                )}
              >
                {it.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function PackageScreenInner({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedTemplate = searchParams.get('template')
  // TABS (2026-09-24 simplification): the workspace was one ~13,000px page on
  // a phone. A link from the template gallery (?template=) opens on Design.
  const [tab, setTab] = useState<WorkspaceTab>(() => {
    const asked = searchParams.get('tab')
    if (asked === 'overview' || asked === 'improve' || asked === 'design' || asked === 'tracker') return asked
    return requestedTemplate ? 'design' : 'overview'
  })
  const [pkg, setPkg] = useState<Package | null>(null)
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [draftTemplate, setDraftTemplate] = useState<TemplateId | null>(() =>
    requestedTemplate ? getTemplate(requestedTemplate).id : null,
  )
  const saveInFlight = useRef(false)
  const [photoBusy, setPhotoBusy] = useState(false)
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
  // Text style opens and closes (founder, 2026-10-04); closed by default.
  const [styleOpen, setStyleOpen] = useState(false)
  const [styleMsg, setStyleMsg] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [stageState, setStageState] = useState<string | null>(null)
  const [trackerDraft, setTrackerDraft] = useState({
    job_url: '',
    application_deadline: '',
    interview_date: '',
    application_notes: '',
  })
  const [trackerState, setTrackerState] = useState<string | null>(null)

  // Gallery previews and picker choices share the same unsaved draft.
  useEffect(() => {
    if (requestedTemplate) setDraftTemplate(getTemplate(requestedTemplate).id)
  }, [requestedTemplate])

  /** Save the exact preview preferences in one metadata-only update. */
  const saveChanges = useCallback(async () => {
    if (!pkg || saveInFlight.current) return
    const templateId = draftTemplate ?? getTemplate(pkg.template_id).id
    const style = draftStyle
    const name = nameDraft.trim()
    saveInFlight.current = true
    setStyleBusy(true)
    setStyleMsg(null)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          styleOverrides: Object.keys(style).length === 0 ? null : style,
          name,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setStyleMsg((data?.error as string) ?? 'Could not save changes. Please try again.')
        return
      }
      // Do not replace drafts: edits made during this request remain unsaved.
      setSavedStyle(style)
      setPkg((prev) => prev ? { ...prev, template_id: templateId, style_overrides: style, name: name || null } : prev)
      setStyleMsg('Changes saved.')
      if (requestedTemplate) router.replace(`/package/${encodeURIComponent(id)}?tab=design`)
    } catch {
      setStyleMsg('Network error. Could not save changes. Please try again.')
    } finally {
      saveInFlight.current = false
      setStyleBusy(false)
    }
  }, [id, pkg, draftTemplate, draftStyle, nameDraft, requestedTemplate, router])

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
        if (isCareerProfileResume(p)) setTab('design')
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
          // Photos are shared profile presentation even for frozen optimized CVs.
          fetch('/api/profile', { cache: 'no-store' })
            .then((r) => { if (!r.ok) throw new Error(); return r.json() })
            .then((latest) => setProfile(latest as CareerProfileFull))
            .catch(() => setError('Could not refresh your Career Profile. Please reload before downloading.'))
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
    profile?.photo_url ?? (pkg.document_snapshot as ResumeDocument | null)?.header?.photoUrl,
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
  const isRaw = isCareerProfileResume(pkg)
  const snapshotDocument = isRaw ? null : (pkg.document_snapshot as ResumeDocument | null) ?? null
  const documentWithLivePhoto = isRaw && profile ? buildCareerProfileResume(profile) : snapshotDocument
    ? applyTargetTitleToDocument(
        applyLivePhotoToDocument(
          snapshotDocument,
          profile?.photo_url ?? null,
          pkg.field_visibility_snapshot ?? null,
        ),
        // Snapshots written before 2026-09-16 froze an empty headline. Filled
        // here so the screen shows what the PDF will print.
        pkg.target_job_title ?? null,
      )
    : null
  const activeTemplateId = draftTemplate ?? savedTemplateId
  const isTrying = activeTemplateId !== savedTemplateId
  const changesDirty = styleDirty || isTrying || nameDraft.trim() !== (pkg.name ?? '').trim()
  const downloadBlocked = changesDirty || styleBusy || photoBusy
  const undoChanges = () => {
    setDraftTemplate(savedTemplateId)
    setDraftStyle(savedStyle)
    setNameDraft(pkg.name ?? '')
    setStyleMsg(null)
    if (requestedTemplate) router.replace(`/package/${encodeURIComponent(id)}?tab=design`)
  }
  const Template = getTemplate(activeTemplateId).component
  /**
   * No model-written text in this row, so it is the user's own profile in a
   * template. Drives the copy and where "Edit" goes. **Never access** — nothing
   * on this screen decides permission.
   */
  const isFree = resumeKind(pkg) === 'free'
  const styleable = getTemplate(activeTemplateId).styleable
  const allowsPhoto = getTemplate(activeTemplateId).allowsPhoto
  // Highlight, borders and header act on the shared engine's designs; Gulf
  // Premium's hand-built style has none of the three, and a side-column design
  // carries the name in the column, with no header to change.
  const activeTheme = getTemplate(activeTemplateId).theme
  const boxStyling = Boolean(activeTheme)
  const headerChoice = Boolean(activeTheme) && activeTheme?.layout !== 'sidebar-filled'
  const highlightLabel = draftStyle.highlight ? HIGHLIGHT_OPTIONS[draftStyle.highlight].label : 'the template\'s own'
  // One line for the closed Text style panel: what is set, in plain words.
  const styleSummary = styleable
    ? [
        draftStyle.font && FONT_OPTIONS[draftStyle.font].label,
        draftStyle.size && SIZE_OPTIONS[draftStyle.size].label,
        draftStyle.accent && ACCENT_OPTIONS[draftStyle.accent].label,
        draftStyle.ink && `${INK_OPTIONS[draftStyle.ink].label} text`,
        draftStyle.highlight &&
          (draftStyle.highlight === 'none' ? 'No highlight' : `${HIGHLIGHT_OPTIONS[draftStyle.highlight].label} highlight`),
        draftStyle.lines === false && 'No borders',
        draftStyle.header && `${HEADER_OPTIONS[draftStyle.header].label} header`,
      ]
        .filter(Boolean)
        .join(' · ') || "The template's own style"
    : 'Fixed for maximum ATS compatibility'
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
    (isRaw ? documentWithLivePhoto : (pkg.document_snapshot as ResumeDocument | null)) ??
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
  const claimReviewRequired = !isRaw && needsClaimReview(pkg.match_report)
  const improveCount = (readMatchReport(pkg.match_report)?.suggestions ?? []).filter((sg) => sg.status === 'pending').length
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
      <div className="flex flex-col gap-3 px-3 pb-3 sm:px-5 pt-3 lg:shrink-0 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4 lg:gap-y-2">
        {/* THE JOB, NOT THE DOCUMENT (2026-09-23): this page is the workspace for
            one target job — its CV, letter, interview preparation and stage — so
            it is titled with the job. Never call a free resume "optimized" — it
            has not been through the model (docs/RULES.md). */}
        <div className="flex min-w-0 flex-col gap-0.5 lg:shrink-0">
          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal">{isRaw ? 'Career Profile Resume' : 'Application workspace'}</span>
          {isRaw ? <span className="self-start rounded-full bg-teal-soft px-3 py-1 text-[12px] font-semibold text-teal">{CAREER_RESUME_BADGE}</span> : null}
          <h1 className="break-words font-display text-[24px] leading-tight text-ink lg:text-[20px]">
            {pkg.name || pkg.target_job_title}
          </h1>
          <p className="text-[12.5px] text-ink-soft">
            {[
              pkg.target_company,
              countryName,
              isRaw ? 'Latest saved profile · No AI optimization' : isFree ? 'CV not optimized yet' : `${pkg.optimization_level.charAt(0).toUpperCase()}${pkg.optimization_level.slice(1)} optimized CV`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        {/* Rename, in place. A user with three attempts at the same role sees
            three identical rows in the Library otherwise — the target job
            title is not something they can change. Saves on blur or Enter;
            clearing it falls back to the job title rather than storing blank. */}
        <label className={`${isRaw ? 'flex' : 'hidden lg:flex'} flex-1 flex-wrap items-center gap-2 text-[12px] text-ink-muted lg:max-w-[420px]`}>
          <span className={isRaw ? '' : 'sr-only lg:not-sr-only'}>Name in your library</span>
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
        </label>

        {/* The document's actions, pushed to the right of the same row.
            The stage control joins them rather than getting a band of its own:
            TASK-160 collapsed five stacked rows into this one specifically to
            give the A4 sheet its vertical room back, and a new full-width
            header would spend exactly what that bought. */}
        {claimReviewRequired ? <p role="status" className="rounded-ctl border border-gold/50 bg-gold-soft p-3 type-helper text-gold-ink">{CLAIM_REVIEW_MESSAGE}</p> : null}
        {/* ON A PHONE (founder 2026-10-04): stage and Download PDF take a full
            row each, then Edit CV and Review changes share one — and a label
            may wrap INSIDE its button. Buttons never wrap by default, so "Review
            and edit changes" ran out past its half-width cell. From `sm` up the
            row is unchanged. */}
        <div className="grid grid-cols-2 items-stretch gap-2 sm:flex sm:flex-wrap sm:items-center lg:ml-auto lg:justify-end [&>a]:justify-center [&>a]:text-center">
          {!isRaw ? <StageSelect className="col-span-2 w-full sm:w-auto" value={pkg.status} onChange={(next) => void saveStage(next)} /> : null}
          {stageState ? <span className="col-span-2 text-[12px] text-alert">{stageState}</span> : null}
          {claimReviewRequired ? (
            <Link href={`/optimize/preview/${id}`} className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'col-span-2 sm:col-auto')}>Review claims before download</Link>
          ) : downloadBlocked ? (
            <>
              {changesDirty || styleBusy ? (
                <button
                  type="button"
                  disabled={styleBusy || photoBusy}
                  onClick={() => void saveChanges()}
                  className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'col-span-2 sm:col-auto disabled:cursor-not-allowed disabled:opacity-50')}
                >
                  {styleBusy ? 'Saving…' : 'Save changes'}
                </button>
              ) : null}
              <button
                type="button"
                disabled
                aria-describedby="resume-save-status"
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'col-span-2 cursor-not-allowed opacity-50 sm:col-auto')}
              >
                {CTA.downloadPdf}
              </button>
            </>
          ) : (
            <a
              href={pdfUrl}
              onClick={() => setDownloaded(true)}
              className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'col-span-2 sm:col-auto')}
            >
              {CTA.downloadPdf}
            </a>
          )}
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
            href={isRaw ? '/profile?view=details' : `/package/${encodeURIComponent(id)}/edit`}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'whitespace-normal leading-tight', isFree && 'col-span-2 sm:col-auto')}
          >
            {isRaw ? 'Edit Career Profile' : CTA.editCv}
          </Link>
          {/* THE DIFF, REACHABLE AGAIN (2026-09-12). Generation lands here, on
              the finished CV, so /optimize/preview — every changed line beside
              the original, the product's "nothing invented" made visible — had
              no link anywhere. Only for a resume the model actually wrote:
              otherwise there is no change to show. */}
          {!isFree ? (
            <Link
              href={`/optimize/preview/${encodeURIComponent(id)}`}
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'whitespace-normal leading-tight')}
            >
              {CTA.seeChanges}
            </Link>
          ) : null}
          {changesDirty ? (
            <button
              type="button"
              disabled={styleBusy}
              onClick={undoChanges}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              Undo changes
            </button>
          ) : null}
          {downloadBlocked || styleMsg ? (
            <span id="resume-save-status" role="status" className="col-span-2 text-[12px] text-ink-muted">
              {styleBusy ? 'Saving changes — PDF download is temporarily disabled.'
                : photoBusy ? 'Saving your photo — PDF download is temporarily disabled.'
                : changesDirty ? `${styleMsg && styleMsg !== 'Changes saved.' ? `${styleMsg} ` : ''}Save changes to enable PDF download.`
                : styleMsg}
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


      {/* Actions live in the header row now (TASK-160); the templates stay in the
          left rail beside the document (TASK-146). What remains here is the
          package journey plus transient notices, so the page explains what this
          job can become without adding backend state. */}
      <div className="flex w-full flex-col gap-4 px-3 pb-8 sm:px-5 lg:gap-3">
        {isRaw ? (
          <div className="flex flex-col gap-3"><p className="text-[13px] text-ink-soft">Content edits and field visibility are saved in your Career Profile. Your resume name, template and styling are saved here. <Link href="/profile?view=settings" className="font-semibold text-teal underline">Choose visible fields</Link></p><PreparationJourney pkg={pkg} current="resume" /></div>
        ) : <WorkspaceTabs tab={tab} onChange={setTab} improveCount={improveCount} />}
        {/* RESULTS FIRST, AS COLOURED CARDS (founder request 2026-09-17): target
            job, ATS score before → after, summary, what changed, next steps.
            components/package/ResultsOverview.tsx. */}
        {tab === 'overview' ? (
        <>
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

        </>
        ) : null}
        {tab === 'improve' ? (
        <>
        {/* Before -> after match score (docs/17_OPTIMIZER_ENGINE.md §5). Only
            on packages built by the optimizer engine; older ones have none. */}
        {(() => {
          const report = readMatchReport(pkg.match_report)
          if (!report?.after)
            return (
              <p className="rounded-card border border-line bg-white px-4 py-5 text-[14px] text-ink-soft">
                There is no ATS score for this job yet. It appears here once the CV has been optimized against the job.
              </p>
            )
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
        </>
        ) : null}

        {tab === 'overview' ? (
        <>
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
        </>
        ) : null}

        {tab === 'tracker' ? (
        <>
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
        </>
        ) : null}

        {tab === 'design' ? (
        <>
        {/* Trying a template from the gallery. This must stay: a click in the
            gallery arrives as ?template= and renders immediately WITHOUT being
            saved, so the user needs an explicit way to keep or discard it —
            otherwise browsing would silently restyle a delivered resume
            (TASK-141). */}
        {isTrying ? (
          <div className="flex flex-col gap-2 rounded-card border border-teal/50 bg-teal-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-teal">
              Previewing <strong>{getTemplate(activeTemplateId).name}</strong>. Use Save changes
              above to keep this template and enable PDF download.
            </p>
          </div>
        ) : null}
        </>
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

        {tab === 'overview' ? (
        <>
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
        </>
        ) : null}

        {tab === 'design' ? (
        <>
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
              {/* ON A PHONE THE PAGE COMES OUT OF ITS BOX (founder 2026-10-04):
                  inside the page gutter plus this frame's padding the A4 sheet
                  had ~326px of a 390px screen. It now reaches 8px from each
                  edge (~374px); the framed "page on a desk" returns from `sm`. */}
              <div className="-mx-3 flex flex-col items-center sm:mx-0 sm:rounded-card sm:bg-gradient-to-b sm:from-canvas sm:to-canvas/60 sm:p-5 sm:ring-1 sm:ring-line/70">
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
                  A4 · {getTemplate(activeTemplateId).name} · {downloadBlocked ? 'save changes before downloading your' : 'this is exactly what downloads as your'}
                  PDF.
                </p>
              </div>
            </section>
          ) : null}

          {previewDocument ? (
            <aside className="order-2 shrink-0 lg:order-1 lg:sticky lg:top-3 lg:max-h-[calc(100dvh-1.5rem)] lg:w-[260px] lg:overflow-y-auto">
              {/* No card around the controls on a phone (founder 2026-10-04):
                  its border and padding took 34px of width from the templates,
                  which then overlapped two-across. The card returns from `sm`. */}
              <div className="sm:rounded-card sm:border sm:border-line sm:bg-white sm:p-4">
                <h2 className="font-display text-[17px] leading-tight text-ink">Templates</h2>
                <p className="mt-1 text-[12px] leading-snug text-ink-muted">
                  Your wording, dates and details stay exactly as they are — only the design
                  changes, and your PDF changes with it.
                </p>
                {/* ---- Text style (TASK-152) --------------------------------
                    Above the template list, because it applies to whichever
                    template is active and the user reaches for it after
                    choosing one, not before.

                    OPENS AND CLOSES (founder, 2026-10-04): with text colour,
                    highlight, borders and header added it runs long on a phone,
                    so it is closed by default and one line says what is set.
                    The photo controls sit outside it, always in reach. */}
                <div className="mt-4 border-t border-line pt-4">
                  <button
                    type="button"
                    aria-expanded={styleOpen}
                    aria-controls="text-style-panel"
                    onClick={() => setStyleOpen((o) => !o)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-ctl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    <span className="min-w-0">
                      <span className="block text-[12px] font-bold uppercase tracking-wider text-ink-soft">
                        Text style
                      </span>
                      <span className="mt-0.5 block text-[12px] text-ink-muted">{styleSummary}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 rounded-full border border-line-strong bg-white px-3 py-1.5 text-[12px] font-semibold text-teal shadow-m-1">
                      {styleOpen ? 'Close' : 'Edit'}
                      <ChevronDownIcon
                        className={cn('size-4 transition-transform', styleOpen && 'rotate-180')}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                  {styleOpen ? (
                    <div id="text-style-panel" className="pb-1">
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
                            <span className="text-[12px] text-ink-muted">Accent colour</span>
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
                          {/* TEXT COLOUR (founder, 2026-10-04): body text and
                              secondary lines darker for print. Headings keep
                              the accent colour — Black is one of those too. */}
                          <StyleChoice
                            label="Text colour"
                            options={Object.entries(INK_OPTIONS).map(([k, v]) => [k, v.label])}
                            value={draftStyle.ink ?? ''}
                            onChange={(v) =>
                              setDraftStyle((s) => ({ ...s, ink: (v || undefined) as InkKey | undefined }))
                            }
                          />
                          {boxStyling ? (
                            <>
                              {/* HIGHLIGHT: the shading behind the summary box,
                                  a header card, skill and date tags and heading
                                  bars. None keeps the lines; Borders below
                                  takes those away too. */}
                              <div className="mt-3">
                                <span className="text-[12px] text-ink-muted">
                                  Highlight · <span className="text-ink-soft">{highlightLabel}</span>
                                </span>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                                  <button
                                    type="button"
                                    aria-pressed={!draftStyle.highlight}
                                    onClick={() => setDraftStyle((s) => ({ ...s, highlight: undefined }))}
                                    className={
                                      'min-h-11 rounded-ctl px-3 py-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1 ' +
                                      (!draftStyle.highlight
                                        ? 'bg-teal text-white'
                                        : 'border border-line bg-white text-ink-soft hover:border-teal/60')
                                    }
                                  >
                                    Default
                                  </button>
                                  {Object.entries(HIGHLIGHT_OPTIONS).map(([k, v]) => {
                                    const active = draftStyle.highlight === k
                                    return (
                                      <button
                                        key={k}
                                        type="button"
                                        title={v.label}
                                        aria-label={k === 'none' ? 'No highlight' : `${v.label} highlight`}
                                        aria-pressed={active}
                                        onClick={() =>
                                          setDraftStyle((s) => ({
                                            ...s,
                                            highlight: active ? undefined : (k as HighlightKey),
                                          }))
                                        }
                                        style={k === 'none' ? undefined : { background: v.soft }}
                                        className={
                                          'relative size-9 overflow-hidden rounded-full bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 ' +
                                          (active
                                            ? 'ring-2 ring-teal ring-offset-2'
                                            : 'ring-1 ring-line-strong hover:ring-teal/60')
                                        }
                                      >
                                        {k === 'none' ? (
                                          // White, struck through: "no shading".
                                          <span
                                            aria-hidden="true"
                                            className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-alert"
                                          />
                                        ) : null}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                              {/* BORDERS: only `false` is ever stored, as with
                                  Show photo — drawing them is the default. */}
                              <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-between gap-3 text-[12px] text-ink-muted">
                                <span>
                                  <span className="block text-ink-soft">Lines &amp; borders</span>
                                  <span className="block">Box edges, tag outlines and heading lines</span>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={draftStyle.lines !== false}
                                  onChange={(e) =>
                                    setDraftStyle((st) => {
                                      const next = { ...st }
                                      if (e.target.checked) delete next.lines
                                      else next.lines = false
                                      return next
                                    })
                                  }
                                  className="size-5 shrink-0 cursor-pointer accent-teal"
                                />
                              </label>
                              {headerChoice ? (
                                <StyleChoice
                                  label="Header"
                                  options={Object.entries(HEADER_OPTIONS).map(([k, v]) => [k, v.label])}
                                  value={draftStyle.header ?? ''}
                                  onChange={(v) =>
                                    setDraftStyle((s) => ({ ...s, header: (v || undefined) as HeaderKey | undefined }))
                                  }
                                />
                              ) : null}
                            </>
                          ) : (
                            <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
                              {getTemplate(activeTemplateId).name} has no shaded boxes or coloured header, so
                              highlight, border and header choices apply to the other designs.
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
                  ) : null}
                </div>

                {profile ? (
                  <div className="mt-4 border-t border-line pt-4">
                    <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">Photo</h3>
                    <div className="mt-2 rounded-ctl border border-teal/20 bg-teal-soft p-3">
                      <p className="text-sm font-semibold text-teal">Make your Gulf CV feel personal</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                        A professional photo is common on some Gulf CVs. It is optional — follow the
                        employer’s instructions, especially for ATS applications.
                      </p>
                    </div>
                    <div className="mt-3">
                      <PhotoUpload
                        photoUrl={profile.photo_url ?? null}
                        allowRemove={false}
                        onBusyChange={setPhotoBusy}
                        onChange={(photoUrl) => setProfile((current) => current ? { ...current, photo_url: photoUrl } : current)}
                      />
                      <p className="mt-2 text-sm text-ink-muted">Uploads save immediately to Career Profile. Show photo is a setting for this resume only.</p>
                    </div>
                    {!allowsPhoto ? (
                      <p className="mt-2 text-sm text-ink-muted">{getTemplate(activeTemplateId).name} does not show photos. Choose a photo-supported template to include yours.</p>
                    ) : null}
                    {allowsPhoto ? (
                      <div className="mt-2">
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
                        {hasPhoto && draftStyle.showPhoto !== false ? (
                          <div className="mt-3 rounded-ctl border border-line bg-white p-3 shadow-m-1">
                            {/* A SIZE BAR, LIKE A VOLUME CONTROL (founder 2026-10-04).
                                The track was `bg-canvas` — the page's own colour —
                                so once this panel lost its white card on phones
                                only the thumb showed. Now: − and + buttons at the
                                ends (one step each), a thick bar that fills
                                teal→gold up to the size, and a big thumb. Same
                                0–100 value in steps of 5, saved exactly as before. */}
                            <label
                              htmlFor="photo-size"
                              className="flex items-baseline justify-between text-[13px] font-semibold text-ink"
                            >
                              <span>Photo size</span>
                              <span className="rounded-full bg-teal-soft px-2 py-0.5 font-mono text-[12px] font-bold text-teal">
                                {photoPos}%{photoPos === PHOTO_DEFAULT ? ' · default' : ''}
                              </span>
                            </label>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                aria-label="Smaller photo"
                                disabled={photoPos <= 0}
                                onClick={() => setDraftStyle((st) => ({ ...st, photo: Math.max(0, photoPos - 5) }))}
                                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-white text-teal shadow-m-1 transition-colors hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-40"
                              >
                                <MinusIcon className="size-5" aria-hidden="true" />
                              </button>
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
                                style={{ '--fill': `${photoPos}%` } as React.CSSProperties}
                                className="range-bar min-w-0 flex-1"
                              />
                              <button
                                type="button"
                                aria-label="Larger photo"
                                disabled={photoPos >= 100}
                                onClick={() => setDraftStyle((st) => ({ ...st, photo: Math.min(100, photoPos + 5) }))}
                                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-white text-teal shadow-m-1 transition-colors hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-40"
                              >
                                <PlusIcon className="size-5" aria-hidden="true" />
                              </button>
                            </div>
                            <div className="mt-1.5 flex justify-between px-[52px] text-[12px] text-ink-muted">
                              <span>Smaller</span>
                              <span>Larger</span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {styleable ? (
                  styleDirty ? (
                    <p className="mt-3 text-[12px] text-ink-muted">
                      Unsaved — use <strong className="text-ink-soft">Save changes</strong> at the top.
                    </p>
                  ) : hasStyle ? (
                    <button
                      type="button"
                      disabled={styleBusy}
                      onClick={() => {
                        setDraftStyle({})
                      }}
                      className={'mt-3 ' + buttonVariants({ variant: 'ghost', size: 'sm' })}
                    >
                      Reset to template default
                    </button>
                  ) : null
                ) : null}

                <div className="mt-4 border-t border-line pt-4">
                  <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-ink-soft">
                    Template
                  </h3>
                  <TemplatePicker
                    layout="rail"
                    document={previewDocument}
                    current={activeTemplateId}
                    busyId={styleBusy ? activeTemplateId : null}
                    onSelect={(nextId) => {
                      if (nextId === activeTemplateId) return
                      setDraftTemplate(nextId)
                      setStyleMsg(null)
                    }}
                  />
                </div>
              </div>
            </aside>
          ) : null}
        </div>
        </>
        ) : null}
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
