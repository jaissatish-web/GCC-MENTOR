import type {
  CareerProfileFull,
  FieldVisibility,
} from '@/types/careerProfile'
import type { OptimizedContent } from '@/types/package'
import { T, PAGE, SIZE } from './tokens'

/**
 * GulfPremium — the single MVP resume template (TASK-031).
 *
 * Design language from screen 10 of design-reference/MVP Screens.dc.html,
 * re-expressed at real A4 scale (see the note in ./tokens.ts).
 *
 * Inline styles only, no Tailwind — required by the PDF pipeline, which
 * renders this with renderToStaticMarkup and no stylesheet. See ./tokens.ts
 * for the full reasoning. All colours/sizes come from there, never inline
 * literals.
 *
 * DATA CONTRACT (docs/DASHBOARD_LIBRARY.md §4):
 *   - Fixed fields (name, contact, employers, titles, dates, education,
 *     certifications) are read LIVE from the profile, never copied from the
 *     package. That is what makes "edit once, reflects everywhere" true.
 *   - Generated text (summary, experience bullets) comes from
 *     optimizedContent. user_edited_* wins over generated_* when present.
 *   - Visibility comes from the package's field_visibility SNAPSHOT, not the
 *     profile's current toggles — the document renders as it was at
 *     generation time.
 *
 * THE HARD REQUIREMENT — "must render correctly for every combination of
 * shown/hidden fields; no empty gaps, no broken alignment, layout closes
 * cleanly." Achieved structurally, not by patching special cases:
 *   1. Every joined line is built by filtering an array then joining, so a
 *      hidden field can never leave a dangling " · " separator.
 *   2. Every section renders only when it has content — the heading is
 *      inside the same conditional as its body, so no orphan labels.
 *   3. The header is flex; when the photo is hidden the text column simply
 *      takes the full width — no reserved empty box.
 *   4. Nothing uses a fixed height that would hold open space when empty.
 */

export interface GulfPremiumProps {
  profile: CareerProfileFull
  optimizedContent: OptimizedContent
  /** Relevance-ordered skill ids for this target (packages.skills_order). */
  skillsOrder?: string[]
  /** The package's visibility snapshot. Omitted => every field shown. */
  fieldVisibility?: Partial<FieldVisibility> | null
}

/** Hidden only when explicitly false — an absent key means visible. */
function visible(fv: Partial<FieldVisibility> | null | undefined, key: keyof FieldVisibility): boolean {
  return fv?.[key] !== false
}

/** Join non-empty parts with a separator. Prevents dangling separators. */
function joinParts(parts: Array<string | null | undefined | false>, sep = ' · '): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.trim() !== '').join(sep)
}

/** "2019-03-01" -> "Mar 2019". Falls back to the raw value if unparseable. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatMonthYear(d: string | null | undefined): string {
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

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: T.sans,
  fontSize: SIZE.sectionLabel,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: T.inkWarm,
  marginTop: '16px',
  marginBottom: '6px',
}

const bodyTextStyle: React.CSSProperties = {
  fontFamily: T.sans,
  fontSize: SIZE.body,
  lineHeight: 1.6,
  color: T.inkBody,
}

/** A section renders only when it has content — label and body together. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ pageBreakInside: 'avoid' }}>
      <div style={sectionLabelStyle}>{title}</div>
      {children}
    </div>
  )
}

export default function GulfPremium({
  profile,
  optimizedContent,
  skillsOrder,
  fieldVisibility,
}: GulfPremiumProps) {
  const fv = fieldVisibility

  // ---- Header -------------------------------------------------------------
  const showPhoto = visible(fv, 'photo') && Boolean(profile.photo_url)
  const showName = visible(fv, 'full_name')
  const displayName = showName ? profile.full_name : ''

  // Identity line 1: nationality · location · visa (+ transferability).
  //
  // Transferability is folded into the visa item rather than listed
  // separately: a visa_status of "Transferable Iqama" alongside a separate
  // "Transferable visa" item reads as duplicated text on the finished CV.
  // Only stated independently when it is not already implied by the status.
  const showVisaStatus = visible(fv, 'visa_status') && Boolean(profile.visa_status)
  const showTransferable =
    visible(fv, 'visa_transferable') &&
    profile.visa_transferable !== null &&
    profile.visa_transferable !== undefined
  const statusMentionsTransfer = /transferab/i.test(profile.visa_status ?? '')

  const visaItem = showVisaStatus
    ? showTransferable && !statusMentionsTransfer
      ? `${profile.visa_status} (${profile.visa_transferable ? 'transferable' : 'not transferable'})`
      : profile.visa_status
    : showTransferable
      ? profile.visa_transferable
        ? 'Transferable visa'
        : 'Visa not transferable'
      : null

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
      `Passport valid to ${profile.passport_validity_date}`,
    visible(fv, 'notice_period') && profile.notice_period && `Notice ${profile.notice_period}`,
  ])

  const hasAnyIdentity = Boolean(identityPrimary || identityContact || identityGulf)
  const hasHeaderText = Boolean(displayName || profile.target_job_title || hasAnyIdentity)

  // ---- Summary ------------------------------------------------------------
  const summary =
    optimizedContent.summary?.user_edited?.trim() ||
    optimizedContent.summary?.generated?.trim() ||
    ''

  // ---- Experience ---------------------------------------------------------
  // Fixed facts live on the profile; only the bullets come from the package.
  const blocksById = new Map(
    (optimizedContent.experience_blocks ?? []).map((b) => [b.profile_experience_id, b]),
  )
  const experience = (profile.work_experience ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((entry) => {
      const block = blocksById.get(entry.id)
      const bullets =
        block?.user_edited_bullets ??
        block?.generated_bullets ??
        entry.highlights ??
        []
      return { entry, bullets: bullets.filter((b) => b && b.trim() !== '') }
    })

  // ---- Skills -------------------------------------------------------------
  // skills_order holds relevance-ordered ids. Anything the order omits is
  // appended in the user's own order so a skill can never silently vanish.
  const skillsById = new Map((profile.skills ?? []).map((s) => [s.id, s]))
  const orderedSkills = (skillsOrder ?? [])
    .map((id) => skillsById.get(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
  const orderedIds = new Set(orderedSkills.map((s) => s.id))
  const remainingSkills = (profile.skills ?? [])
    .filter((s) => !orderedIds.has(s.id))
    .sort((a, b) => a.sort_order - b.sort_order)
  const skills = [...orderedSkills, ...remainingSkills]

  const certifications = (profile.certifications ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
  const education = (profile.education ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
  const additional = visible(fv, 'additional_information')
    ? (profile.additional_information ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
    : []

  return (
    <div
      id="resume-render"
      style={{
        width: PAGE.width,
        minHeight: PAGE.minHeight,
        padding: PAGE.padding,
        boxSizing: 'border-box',
        margin: '0 auto',
        background: T.white,
        fontFamily: T.sans,
        color: T.inkBody,
      }}
    >
      {/* ── HEADER ── photo + name + target title + identity lines ── */}
      {hasHeaderText || showPhoto ? (
        <div
          style={{
            display: 'flex',
            gap: showPhoto ? '18px' : '0',
            alignItems: 'flex-start',
            paddingBottom: '14px',
            borderBottom: `2px solid ${T.midnight}`,
          }}
        >
          {showPhoto ? (
            <div
              style={{
                width: '78px',
                height: '96px',
                flex: 'none',
                borderRadius: '4px',
                overflow: 'hidden',
                background: T.sand,
                border: `1px solid ${T.lineStrong}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.photo_url ?? ''}
                alt={displayName ? `${displayName}, profile photo` : 'Profile photo'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
            {displayName ? (
              <div
                style={{
                  fontFamily: T.serif,
                  fontSize: SIZE.name,
                  lineHeight: 1.1,
                  color: T.midnight,
                }}
              >
                {displayName}
              </div>
            ) : null}

            {profile.target_job_title ? (
              <div
                style={{
                  fontFamily: T.sans,
                  fontSize: SIZE.targetTitle,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: T.goldText,
                }}
              >
                {profile.target_job_title}
              </div>
            ) : null}

            {hasAnyIdentity ? (
              <div
                style={{
                  fontFamily: T.sans,
                  fontSize: SIZE.identity,
                  lineHeight: 1.5,
                  color: T.inkMuted,
                  marginTop: '2px',
                }}
              >
                {identityPrimary ? <div>{identityPrimary}</div> : null}
                {identityContact ? <div>{identityContact}</div> : null}
                {identityGulf ? <div>{identityGulf}</div> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── PROFESSIONAL SUMMARY ── */}
      {summary ? (
        <Section title="Professional summary">
          <div style={bodyTextStyle}>{summary}</div>
        </Section>
      ) : null}

      {/* ── EXPERIENCE ── */}
      {experience.length > 0 ? (
        <Section title="Experience">
          {experience.map(({ entry, bullets }) => {
            const range = dateRange(entry.start_date, entry.end_date)
            const companyLine = joinParts([entry.company, entry.location])
            return (
              <div key={entry.id} style={{ marginBottom: '11px', pageBreakInside: 'avoid' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: '12px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: T.sans,
                      fontSize: SIZE.roleTitle,
                      fontWeight: 600,
                      color: T.midnight,
                    }}
                  >
                    {entry.role}
                  </span>
                  {range ? (
                    <span
                      style={{
                        fontFamily: T.mono,
                        fontSize: SIZE.date,
                        color: T.inkMuted,
                        whiteSpace: 'nowrap',
                        flex: 'none',
                      }}
                    >
                      {range}
                    </span>
                  ) : null}
                </div>

                {companyLine ? (
                  <div
                    style={{
                      fontFamily: T.sans,
                      fontSize: SIZE.meta,
                      color: T.inkMuted,
                      marginTop: '1px',
                    }}
                  >
                    {companyLine}
                  </div>
                ) : null}

                {entry.description ? (
                  <div style={{ ...bodyTextStyle, marginTop: '3px' }}>{entry.description}</div>
                ) : null}

                {bullets.length > 0 ? (
                  <div style={{ marginTop: '3px' }}>
                    {bullets.map((b, i) => (
                      <div
                        key={i}
                        style={{ ...bodyTextStyle, display: 'flex', gap: '6px', marginBottom: '1px' }}
                      >
                        <span style={{ flex: 'none' }}>•</span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </Section>
      ) : null}

      {/* ── KEY SKILLS ── reordered by relevance, never reworded ── */}
      {skills.length > 0 ? (
        <Section title="Key skills">
          <div style={bodyTextStyle}>{skills.map((s) => s.name).join(' · ')}</div>
        </Section>
      ) : null}

      {/* ── CERTIFICATIONS ── */}
      {certifications.length > 0 ? (
        <Section title="Certifications">
          <div style={bodyTextStyle}>
            {certifications
              .map((c) => {
                const year = c.issue_date ? /^(\d{4})/.exec(c.issue_date)?.[1] : null
                const label = joinParts([c.name, c.issuer], ' — ')
                return year ? `${label} (${year})` : label
              })
              .filter(Boolean)
              .join(' · ')}
          </div>
        </Section>
      ) : null}

      {/* ── EDUCATION ── */}
      {education.length > 0 ? (
        <Section title="Education">
          {education.map((ed) => {
            // "B.E. Instrumentation & Control — Anna University", matching
            // the mockup's education line (screen 10).
            const qualification = joinParts([ed.degree, ed.field_of_study], ' ')
            const years =
              ed.start_year && ed.end_year
                ? `${ed.start_year}—${ed.end_year}`
                : ed.end_year
                  ? String(ed.end_year)
                  : ed.start_year
                    ? String(ed.start_year)
                    : ''
            return (
              <div
                key={ed.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: '12px',
                  marginBottom: '3px',
                  pageBreakInside: 'avoid',
                }}
              >
                <span style={bodyTextStyle}>{joinParts([qualification, ed.institution], ' — ')}</span>
                {years ? (
                  <span
                    style={{
                      fontFamily: T.mono,
                      fontSize: SIZE.date,
                      color: T.inkMuted,
                      whiteSpace: 'nowrap',
                      flex: 'none',
                    }}
                  >
                    {years}
                  </span>
                ) : null}
              </div>
            )
          })}
        </Section>
      ) : null}

      {/* ── ADDITIONAL INFORMATION ── one block, one toggle (MVP scope) ── */}
      {additional.length > 0 ? (
        <Section title="Additional information">
          <div style={bodyTextStyle}>
            {additional.map((a) => joinParts([a.label, a.value], ': ')).filter(Boolean).join(' · ')}
          </div>
        </Section>
      ) : null}
    </div>
  )
}
