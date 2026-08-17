import type { CareerProfileFull, FieldVisibility } from '@/types/careerProfile'
import type { OptimizedContent } from '@/types/package'
import { T, PAGE, SIZE } from './tokens'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import type { ResumeStyleOverrides } from '@/lib/resumeStyle'

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
 * RENDERING ONLY (refactored for TASK-032). This component is now purely a
 * renderer: every "what the document says" decision — the visibility filtering,
 * the dangling-separator-safe joins, the visa/transferability folding, the
 * summary user-edited ?? generated precedence, the skills_order relevance
 * ordering with omitted skills appended, the date-range "Present" handling, the
 * certification/education display strings — lives in ONE shared, render-agnostic
 * module, lib/resumeDocument.ts (`buildResumeDocument`), which the PDF renderer
 * (this component) and the DOCX renderer (app/api/packages/[id]/docx/route.ts)
 * both consume. Two formats, one derivation — they can never drift.
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
 * cleanly." Achieved structurally, not by patching special cases (and verified
 * by the TASK-031 2^15-permutation test against a golden baseline, which this
 * refactor must keep byte-identical — see scripts/verify-resume.ts):
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
  /**
   * The document AS DELIVERED (packages.document_snapshot, migration 034).
   *
   * When present it is rendered verbatim and the profile is ignored, so a
   * resume the user has already paid for cannot change because they later
   * edited their Career Profile — which is what happened before, since every
   * fixed field was read live at render time. Absent for packages generated
   * before migration 034, which keep building from the live profile exactly as
   * they always did.
   */
  document?: ResumeDocument | null
  /**
   * The user's own font / size / accent choices (TASK-152, migration 037).
   *
   * Honoured by every engine-driven template. **Ignored by this component and by
   * AtsClassic**, which are hand-written with explicit sizes and faces on each
   * element, so there is nothing for an override to cascade into. That is a real
   * gap rather than a design choice — Gulf Premium is the DEFAULT template — and
   * `/package/[id]` says so plainly instead of showing controls that do nothing.
   * Recorded as Unplanned #26: porting this component onto the engine would fix
   * it and would also bring it under the golden baseline's protection.
   */
  styleOverrides?: ResumeStyleOverrides | null
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
  // Never leave a section heading alone at the bottom of a page.
  pageBreakAfter: 'avoid',
  breakAfter: 'avoid',
}

const bodyTextStyle: React.CSSProperties = {
  fontFamily: T.sans,
  fontSize: SIZE.body,
  lineHeight: 1.6,
  color: T.inkBody,
}

/**
 * A section renders only when it has content — label and body together.
 *
 * NO pageBreakInside:avoid on the section itself, deliberately. It used to have
 * one, and that is what produced the printed "gap": an Experience section with
 * several jobs cannot fit on one page, so the browser tried, failed, and pushed
 * the whole block to the next page — leaving a large blank area at the bottom
 * of the previous one. Measured: 2.32 pages of content printed across FOUR
 * pages.
 *
 * The right granularity is the individual entry, which already carries its own
 * avoid — so a single job or degree is never split — while the section is free
 * to flow across a page boundary the way a document does. The heading is kept
 * with its first entry by breakAfter on the label, so it can never be stranded
 * alone at the foot of a page.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
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
  document,
}: GulfPremiumProps) {
  const {
    header,
    summary,
    experience,
    skills,
    certifications,
    education,
    additional,
  } = document ?? buildResumeDocument({ profile, optimizedContent, skillsOrder, fieldVisibility })

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
      {header.hasHeaderText || header.showPhoto ? (
        <div
          style={{
            display: 'flex',
            gap: header.showPhoto ? '18px' : '0',
            alignItems: 'flex-start',
            paddingBottom: '14px',
            borderBottom: `2px solid ${T.midnight}`,
          }}
        >
          {header.showPhoto ? (
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
                src={header.photoUrl ?? ''}
                alt={header.displayName ? `${header.displayName}, profile photo` : 'Profile photo'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
            {header.displayName ? (
              <div
                style={{
                  fontFamily: T.serif,
                  fontSize: SIZE.name,
                  lineHeight: 1.1,
                  color: T.midnight,
                }}
              >
                {header.displayName}
              </div>
            ) : null}

            {header.targetJobTitle ? (
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
                {header.targetJobTitle}
              </div>
            ) : null}

            {header.hasAnyIdentity ? (
              <div
                style={{
                  fontFamily: T.sans,
                  fontSize: SIZE.identity,
                  lineHeight: 1.5,
                  color: T.inkMuted,
                  marginTop: '2px',
                }}
              >
                {header.identityPrimary ? <div>{header.identityPrimary}</div> : null}
                {header.identityContact ? <div>{header.identityContact}</div> : null}
                {header.identityGulf ? <div>{header.identityGulf}</div> : null}
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
          {experience.map(({ entry, bullets, range, companyLine }) => {
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
            {certifications.map((c) => c.display).filter(Boolean).join(' · ')}
          </div>
        </Section>
      ) : null}

      {/* ── EDUCATION ── */}
      {education.length > 0 ? (
        <Section title="Education">
          {education.map((ed) => (
            <div
              key={ed.entry.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: '12px',
                marginBottom: '3px',
                pageBreakInside: 'avoid',
              }}
            >
              <span style={bodyTextStyle}>{ed.line}</span>
              {ed.years ? (
                <span
                  style={{
                    fontFamily: T.mono,
                    fontSize: SIZE.date,
                    color: T.inkMuted,
                    whiteSpace: 'nowrap',
                    flex: 'none',
                  }}
                >
                  {ed.years}
                </span>
              ) : null}
            </div>
          ))}
        </Section>
      ) : null}

      {/* ── ADDITIONAL INFORMATION ── one block, one toggle (MVP scope) ── */}
      {additional.length > 0 ? (
        <Section title="Additional information">
          <div style={bodyTextStyle}>
            {additional.map((a) => a.display).filter(Boolean).join(' · ')}
          </div>
        </Section>
      ) : null}
    </div>
  )
}
