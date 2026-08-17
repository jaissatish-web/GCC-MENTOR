import type {
  CareerProfileFull,
  FieldVisibility,
  ProfileAdditionalInformation,
  ProfileCertification,
  ProfileEducation,
  ProfileSkill,
  ProfileWorkExperience,
} from '@/types/careerProfile'
import type { OptimizedContent } from '@/types/package'

/**
 * buildResumeDocument — the SINGLE derivation of what a resume says, shared by
 * every renderer (TASK-032).
 *
 * Placing this logic in one place is the whole point: "same data, different
 * format, not a second content pipeline." The PDF renderer (GulfPremium → HTML
 * → Puppeteer) and the DOCX renderer both consume this exact same pure, plain,
 * render-agnostic structure, so a fix to, say, the visa/transferability folding
 * or the skills relevance ordering lands in BOTH formats at once and can never
 * silently drift.
 *
 * This returns a plain data object — no JSX, no styling. Every string is already
 * filtered by visibility, ordered, and joined exactly as the document will print
 * it (including the " · " separators and " — Present" ranges), so a renderer
 * cannot re-derive anything.
 *
 * The derivation is ported VERBATIM from components/templates/GulfPremium.tsx
 * (approved, TASK-031), including its hard-won edge cases:
 *   - visa folding: a visa_status that already mentions "transferab" must NOT
 *     also gain a separate "(transferable)" suffix
 *   - joinParts serves as the dangling-separator guard on every joined line
 *   - bullets precedence: user_edited_bullets ?? generated_bullets ??
 *     entry.highlights
 *   - skills_order relevance ordering with omitted skills appended in the
 *     user's own order so none can vanish
 *   - formatMonthYear/dateRange "Present" handling for a null end date
 *   - every visible(fv, key) visibility decision
 */

/** Hidden only when explicitly false — an absent key means visible. */
export function visible(
  fv: Partial<FieldVisibility> | null | undefined,
  key: keyof FieldVisibility
): boolean {
  return fv?.[key] !== false
}

/** Join non-empty parts with a separator. Prevents dangling separators. */
export function joinParts(
  parts: Array<string | null | undefined | false>,
  sep = ' · '
): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.trim() !== '').join(sep)
}

/** "2019-03-01" -> "Mar 2019". Falls back to the raw value if unparseable. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function formatMonthYear(d: string | null | undefined): string {
  if (!d) return ''
  const m = /^(\d{4})-(\d{2})/.exec(d)
  if (!m) return d
  return `${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}`.trim()
}

function dateRange(start: string | null | undefined, end: string | null | undefined): string {
  const s = formatMonthYear(start)
  if (!s) return ''
  // A null end_date means "current" (docs/CAREER_PROFILE.md §3).
  return `${s} — ${end ? formatMonthYear(end) : 'Present'}`
}

export interface ResumeExperienceItem {
  entry: ProfileWorkExperience
  bullets: string[]
  range: string
  companyLine: string
}

export interface ResumeCertificationItem {
  entry: ProfileCertification
  display: string
}

export interface ResumeEducationItem {
  entry: ProfileEducation
  line: string
  years: string
}

export interface ResumeAdditionalItem {
  entry: ProfileAdditionalInformation
  display: string
}

export interface ResumeDocument {
  header: {
    showPhoto: boolean
    photoUrl: string | null
    displayName: string
    targetJobTitle: string
    hasAnyIdentity: boolean
    identityPrimary: string
    identityContact: string
    identityGulf: string
    hasHeaderText: boolean
  }
  summary: string
  experience: ResumeExperienceItem[]
  skills: ProfileSkill[]
  certifications: ResumeCertificationItem[]
  education: ResumeEducationItem[]
  additional: ResumeAdditionalItem[]
}

export interface ResumeDocumentInput {
  profile: CareerProfileFull
  optimizedContent: OptimizedContent
  /** Relevance-ordered skill ids for this target (packages.skills_order). */
  skillsOrder?: string[]
  /** The package's visibility snapshot. Omitted => every field shown. */
  fieldVisibility?: Partial<FieldVisibility> | null
}

export function buildResumeDocument({
  profile,
  optimizedContent,
  skillsOrder,
  fieldVisibility,
}: ResumeDocumentInput): ResumeDocument {
  const fv = fieldVisibility

  // ---- Header -------------------------------------------------------------
  const showPhoto = visible(fv, 'photo') && Boolean(profile.photo_url)
  const showName = visible(fv, 'full_name')
  const displayName = showName ? profile.full_name : ''

  const showVisaStatus = visible(fv, 'visa_status') && Boolean(profile.visa_status)
  const showTransferable =
    visible(fv, 'visa_transferable') &&
    profile.visa_transferable !== null &&
    profile.visa_transferable !== undefined
  const statusMentionsTransfer = /transferab/i.test(profile.visa_status ?? '')

  let visaItem: string | null = null
  if (showVisaStatus) {
    visaItem =
      showTransferable && !statusMentionsTransfer
        ? `${profile.visa_status} (${profile.visa_transferable ? 'transferable' : 'not transferable'})`
        : profile.visa_status
  } else if (showTransferable) {
    visaItem = profile.visa_transferable ? 'Transferable visa' : 'Visa not transferable'
  }

  // Identity line 1: nationality · location · visa (+ transferability).
  const identityPrimary = joinParts([
    visible(fv, 'nationality') && profile.nationality,
    visible(fv, 'current_location') && profile.current_location,
    visaItem,
  ])
  // Identity line 2: contact
  const identityContact = joinParts([
    visible(fv, 'phone') && profile.phone,
    visible(fv, 'whatsapp') && profile.whatsapp && `WhatsApp ${profile.whatsapp}`,
    visible(fv, 'email') && profile.email,
    visible(fv, 'linkedin_url') && profile.linkedin_url,
  ])
  // Identity line 3: the Gulf-specific readiness fields
  const identityGulf = joinParts([
    visible(fv, 'date_of_birth') && profile.date_of_birth && `DOB ${profile.date_of_birth}`,
    visible(fv, 'passport_type') && profile.passport_type && `Passport ${profile.passport_type}`,
    visible(fv, 'passport_validity') &&
      profile.passport_validity_date &&
      // Month/year, like every other date on the CV. A raw ISO string reads as
      // a bug, and the day is padding from lib/partialDates.ts whenever the
      // source only stated a month — never something the user actually typed.
      `Passport valid to ${formatMonthYear(profile.passport_validity_date)}`,
    visible(fv, 'notice_period') && profile.notice_period && `Notice ${profile.notice_period}`,
  ])

  const hasAnyIdentity = Boolean(identityPrimary || identityContact || identityGulf)
  const hasHeaderText = Boolean(displayName || profile.target_job_title || hasAnyIdentity)

  // ---- Summary (user-edited > generated > the user's own) -----------------
  //
  // The third fallback is new (TASK-134) and was found by testing rather than
  // reading: with no optimized content — a FREE CV rendered straight from the
  // profile — this returned an empty string, so the document came out with no
  // summary at all. The user's own professional_summary is their own writing,
  // which is exactly what belongs on a CV nobody paid to have rewritten.
  //
  // It cannot affect a paid resume's wording: a generated summary always wins,
  // and this only fills the case that previously rendered blank.
  const summary =
    optimizedContent.summary?.user_edited?.trim() ||
    optimizedContent.summary?.generated?.trim() ||
    profile.professional_summary?.trim() ||
    ''

  // ---- Experience ---------------------------------------------------------
  // Fixed facts live on the profile; only the bullets come from the package.
  const blocksById = new Map(
    (optimizedContent.experience_blocks ?? []).map((b) => [b.profile_experience_id, b])
  )
  const experience: ResumeExperienceItem[] = (profile.work_experience ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((entry) => {
      const block = blocksById.get(entry.id)
      const bullets =
        block?.user_edited_bullets ?? block?.generated_bullets ?? entry.highlights ?? []
      return {
        entry,
        bullets: bullets.filter((b) => b && b.trim() !== ''),
        range: dateRange(entry.start_date, entry.end_date),
        companyLine: joinParts([entry.company, entry.location]),
      }
    })

  // ---- Skills -------------------------------------------------------------
  // skills_order holds relevance-ordered ids. Anything the order omits is
  // appended in the user's own order so a skill can never silently vanish.
  const skillsById = new Map((profile.skills ?? []).map((s) => [s.id, s]))
  const orderedSkills = (skillsOrder ?? [])
    .map((id) => skillsById.get(id))
    .filter((s): s is ProfileSkill => Boolean(s))
  const orderedIds = new Set(orderedSkills.map((s) => s.id))
  const remainingSkills = (profile.skills ?? [])
    .filter((s) => !orderedIds.has(s.id))
    .sort((a, b) => a.sort_order - b.sort_order)
  const skills = [...orderedSkills, ...remainingSkills]

  // ---- Certifications -----------------------------------------------------
  const certifications: ResumeCertificationItem[] = (profile.certifications ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((entry) => {
      const year = entry.issue_date ? /^(\d{4})/.exec(entry.issue_date)?.[1] : null
      const label = joinParts([entry.name, entry.issuer], ' — ')
      return { entry, display: year ? `${label} (${year})` : label }
    })

  // ---- Education ----------------------------------------------------------
  const education: ResumeEducationItem[] = (profile.education ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((entry) => {
      // "B.E. Instrumentation & Control — Anna University"
      const qualification = joinParts([entry.degree, entry.field_of_study], ' ')
      const years =
        entry.start_year && entry.end_year
          ? `${entry.start_year}—${entry.end_year}`
          : entry.end_year
            ? String(entry.end_year)
            : entry.start_year
              ? String(entry.start_year)
              : ''
      return { entry, line: joinParts([qualification, entry.institution], ' — '), years }
    })

  // ---- Additional information (one block, one visibility decision) --------
  const additional: ResumeAdditionalItem[] = visible(fv, 'additional_information')
    ? (profile.additional_information ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((entry) => ({ entry, display: joinParts([entry.label, entry.value], ': ') }))
    : []

  return {
    header: {
      showPhoto,
      photoUrl: profile.photo_url,
      displayName,
      targetJobTitle: profile.target_job_title,
      hasAnyIdentity,
      identityPrimary,
      identityContact,
      identityGulf,
      hasHeaderText,
    },
    summary,
    experience,
    skills,
    certifications,
    education,
    additional,
  }
}

/**
 * Re-apply the user's own text edits to an ALREADY-FROZEN document (TASK-145).
 *
 * THE BUG THIS CLOSES. Migration 034 froze the rendered document so that
 * editing the Career Profile could not rewrite a resume someone had already
 * paid for. But the snapshot is written exactly once, at generation, and
 * generation refuses to run twice (app/api/optimize/route.ts's idempotence
 * check). Editing the resume's TEXT — "Edit text" on /package/[id] →
 * /optimize/preview/[id] → PATCH /api/packages/[id] — updates
 * `optimized_content` and nothing else. Both renderers that matter prefer the
 * snapshot, so every edit was silently dropped from the on-screen document and
 * from the downloaded PDF while still showing as saved on the edit screen.
 *
 * WHY NOT JUST REBUILD THE WHOLE DOCUMENT. Calling buildResumeDocument again at
 * edit time would read the LIVE profile, which is precisely what migration 034
 * exists to prevent: a user who changed their job title and then fixed a typo
 * in a bullet would have the title change leak into a delivered resume. So this
 * touches ONLY the two things a user can actually edit — the summary and the
 * experience bullets — and leaves every fixed field exactly as delivered.
 *
 * FALLBACKS POINT AT THE SNAPSHOT, NOT THE PROFILE. buildResumeDocument falls
 * back to profile.professional_summary and entry.highlights; there is no
 * profile here by design, so an empty edit falls back to what the frozen
 * document already says. Clearing an edit therefore restores the delivered
 * wording rather than blanking a paid document.
 *
 * Precedence is kept identical to buildResumeDocument above — the two must
 * agree, which is why this lives beside it rather than in the route.
 */
export function applyContentEditsToDocument(
  doc: ResumeDocument,
  optimizedContent: OptimizedContent
): ResumeDocument {
  const summary =
    optimizedContent.summary?.user_edited?.trim() ||
    optimizedContent.summary?.generated?.trim() ||
    doc.summary

  const blocksById = new Map(
    (optimizedContent.experience_blocks ?? []).map((b) => [b.profile_experience_id, b])
  )

  const experience = doc.experience.map((item) => {
    const block = blocksById.get(item.entry.id)
    if (!block) return item
    const bullets = block.user_edited_bullets ?? block.generated_bullets ?? null
    if (bullets === null) return item
    const cleaned = bullets.filter((b) => b && b.trim() !== '')
    return { ...item, bullets: cleaned }
  })

  return { ...doc, summary, experience }
}
