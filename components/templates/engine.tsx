import type { GulfPremiumProps } from './GulfPremium'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import { PAGE } from './tokens'

/**
 * The shared resume rendering engine (TASK-137).
 *
 * WHY AN ENGINE AND NOT TEN COMPONENTS. Ten hand-written templates means ten
 * places to fix a page-break bug, ten chances for one to drift out of step with
 * the document model, and ten files to touch when a field is added. The spec's
 * §26 asks for exactly this: a shared base document system with template-level
 * overrides, not "seven independent CSS systems".
 *
 * So a template here is DATA — a `TemplateTheme` — and this file is the single
 * renderer that turns a theme plus the canonical `ResumeDocument` into an A4
 * page. Every template therefore inherits the same section logic, the same
 * empty-section suppression (§22), and the same page-break behaviour, and they
 * differ only where a designer would actually differ: layout, type, rules,
 * density, colour.
 *
 * Inline styles only, no Tailwind — the PDF pipeline renders this through
 * renderToStaticMarkup with no stylesheet attached. Same hard constraint as
 * every template in this folder.
 */

export type HeadingStyle =
  /** Uppercase label above a hairline rule. Traditional, highly parseable. */
  | 'rule'
  /** Uppercase label, no rule — relies on space alone. Quiet and modern. */
  | 'plain'
  /** Filled bar behind the label. Strong scanning anchor, still real text. */
  | 'band'
  /** Small caps label set to the left of its content in a narrow gutter. */
  | 'side'

export type LayoutStyle =
  /** One column, everything in reading order. Safest for parsers. */
  | 'single'
  /** Narrow left rail (contact, skills, certifications) beside the main flow. */
  | 'sidebar'

export interface TemplateTheme {
  /** Display + body faces. Web-safe stacks only: the PDF renderer has no CDN. */
  displayFont: string
  bodyFont: string
  /** Base body size in pt. Everything else scales from it. */
  bodySize: number
  nameSize: number
  headingSize: number
  /** Multiplies vertical rhythm. 1 = comfortable, 0.8 = compact. */
  density: number
  ink: string
  muted: string
  rule: string
  accent: string
  /** Background behind a 'band' heading, and the sidebar fill. */
  accentSoft: string
  headingStyle: HeadingStyle
  layout: LayoutStyle
  /** Uppercase the name. Reads as formal; used by the executive themes. */
  uppercaseName: boolean
  /** Templates aimed at parsers refuse the photo whatever the profile holds. */
  allowPhoto: boolean
  /** Section titles, so a technical template can say "Technical Expertise". */
  labels?: Partial<Record<SectionKey, string>>
}

type SectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'additional'

const DEFAULT_LABELS: Record<SectionKey, string> = {
  summary: 'Professional Summary',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
  additional: 'Additional Information',
}

function pt(n: number): string {
  return `${Math.round(n * 100) / 100}pt`
}

/** Section heading. Always a real <h2>: the level is the machine-readable part. */
function Heading({ theme, children }: { theme: TemplateTheme; children: string }) {
  const base: React.CSSProperties = {
    fontFamily: theme.displayFont,
    fontSize: pt(theme.headingSize),
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: theme.headingStyle === 'band' ? '#FFFFFF' : theme.accent,
    margin: `${14 * theme.density}px 0 ${5 * theme.density}px`,
    // A heading must never be the last thing on a page.
    pageBreakAfter: 'avoid',
    breakAfter: 'avoid',
  }

  if (theme.headingStyle === 'rule') {
    return (
      <h2 style={{ ...base, borderBottom: `1px solid ${theme.rule}`, paddingBottom: '3px' }}>
        {children}
      </h2>
    )
  }
  if (theme.headingStyle === 'band') {
    return (
      <h2 style={{ ...base, background: theme.accent, padding: '3px 8px', borderRadius: '2px' }}>
        {children}
      </h2>
    )
  }
  if (theme.headingStyle === 'side') {
    return (
      <h2 style={{ ...base, borderLeft: `3px solid ${theme.accent}`, paddingLeft: '8px' }}>
        {children}
      </h2>
    )
  }
  return <h2 style={base}>{children}</h2>
}

function Section({
  theme,
  title,
  children,
}: {
  theme: TemplateTheme
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <Heading theme={theme}>{title}</Heading>
      {children}
    </section>
  )
}

export function renderTemplate(theme: TemplateTheme, props: GulfPremiumProps): React.JSX.Element {
  const doc: ResumeDocument =
    props.document ??
    buildResumeDocument({
      profile: props.profile,
      optimizedContent: props.optimizedContent,
      skillsOrder: props.skillsOrder,
      fieldVisibility: props.fieldVisibility,
    })

  const { header, summary, experience, skills, certifications, education, additional } = doc
  const label = (k: SectionKey) => theme.labels?.[k] ?? DEFAULT_LABELS[k]

  const body: React.CSSProperties = {
    fontFamily: theme.bodyFont,
    fontSize: pt(theme.bodySize),
    lineHeight: 1.28 + 0.16 * theme.density,
    color: theme.ink,
  }
  const showPhoto = theme.allowPhoto && header.showPhoto && !!header.photoUrl

  const contactLine = [header.identityPrimary, header.identityContact, header.identityGulf]
    .filter(Boolean)
    .join('  |  ')

  const HeaderBlock = header.hasHeaderText ? (
    <header style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: `${6 * theme.density}px` }}>
      {showPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={header.photoUrl as string}
          alt=""
          style={{ width: '72px', height: '90px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }}
        />
      ) : null}
      <div style={{ minWidth: 0 }}>
        {header.displayName ? (
          <h1
            style={{
              fontFamily: theme.displayFont,
              fontSize: pt(theme.nameSize),
              fontWeight: 700,
              letterSpacing: theme.uppercaseName ? '0.06em' : '0.01em',
              textTransform: theme.uppercaseName ? 'uppercase' : 'none',
              color: theme.ink,
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            {header.displayName}
          </h1>
        ) : null}
        {header.targetJobTitle ? (
          <p style={{ ...body, fontSize: pt(theme.bodySize + 1.2), color: theme.accent, margin: '2px 0 0', fontWeight: 600 }}>
            {header.targetJobTitle}
          </p>
        ) : null}
        {contactLine && theme.layout === 'single' ? (
          <p style={{ ...body, fontSize: pt(theme.bodySize - 0.8), color: theme.muted, margin: '4px 0 0' }}>
            {contactLine}
          </p>
        ) : null}
      </div>
    </header>
  ) : null

  const ExperienceBlock =
    experience.length > 0 ? (
      <Section theme={theme} title={label('experience')}>
        {experience.map((item) => (
          <div key={item.entry.id} style={{ marginBottom: `${9 * theme.density}px`, pageBreakInside: 'avoid' }}>
            <p style={{ ...body, margin: 0, fontWeight: 700 }}>{item.entry.role}</p>
            {item.companyLine ? (
              <p style={{ ...body, margin: '1px 0 0', fontSize: pt(theme.bodySize - 0.5), color: theme.muted }}>
                {item.companyLine}
              </p>
            ) : null}
            {item.bullets.length > 0 ? (
              <ul style={{ margin: `${3 * theme.density}px 0 0`, paddingLeft: '16px' }}>
                {item.bullets.map((b, i) => (
                  <li key={i} style={{ ...body, marginBottom: `${2 * theme.density}px` }}>
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </Section>
    ) : null

  const SummaryBlock = summary ? (
    <Section theme={theme} title={label('summary')}>
      <p style={{ ...body, margin: 0 }}>{summary}</p>
    </Section>
  ) : null

  const EducationBlock =
    education.length > 0 ? (
      <Section theme={theme} title={label('education')}>
        {education.map((item) => (
          <p key={item.entry.id} style={{ ...body, margin: `0 0 ${3 * theme.density}px` }}>
            {item.line}
            {item.years ? `, ${item.years}` : ''}
          </p>
        ))}
      </Section>
    ) : null

  const SkillsBlock =
    skills.length > 0 ? (
      <Section theme={theme} title={label('skills')}>
        <p style={{ ...body, margin: 0 }}>{skills.map((s) => s.name).join(' · ')}</p>
      </Section>
    ) : null

  const CertificationsBlock =
    certifications.length > 0 ? (
      <Section theme={theme} title={label('certifications')}>
        <ul style={{ margin: 0, paddingLeft: '16px' }}>
          {certifications.map((item) => (
            <li key={item.entry.id} style={{ ...body, marginBottom: `${2 * theme.density}px` }}>
              {item.display}
            </li>
          ))}
        </ul>
      </Section>
    ) : null

  const AdditionalBlock =
    additional.length > 0 ? (
      <Section theme={theme} title={label('additional')}>
        <ul style={{ margin: 0, paddingLeft: '16px' }}>
          {additional.map((item) => (
            <li key={item.entry.id} style={{ ...body, marginBottom: `${2 * theme.density}px` }}>
              {item.display}
            </li>
          ))}
        </ul>
      </Section>
    ) : null

  const page: React.CSSProperties = {
    width: PAGE.width,
    minHeight: PAGE.minHeight,
    padding: PAGE.padding,
    boxSizing: 'border-box',
    margin: '0 auto',
    background: '#FFFFFF',
    ...body,
  }

  if (theme.layout === 'sidebar') {
    // The rail carries only SUPPORTING facts. Experience and summary stay in
    // the main flow, in reading order, so flattening the columns for a parser
    // still yields a sane document.
    return (
      <div id="resume-render" style={page}>
        {HeaderBlock}
        <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
          <aside
            style={{
              width: '204px',
              flexShrink: 0,
              background: theme.accentSoft,
              padding: '10px 12px',
              borderRadius: '2px',
            }}
          >
            {contactLine ? (
              <p style={{ ...body, fontSize: pt(theme.bodySize - 0.8), color: theme.muted, margin: 0, wordBreak: 'break-word' }}>
                {[header.identityPrimary, header.identityContact, header.identityGulf]
                  .filter(Boolean)
                  .join('\n')
                  .split('\n')
                  .map((l, i) => (
                    <span key={i} style={{ display: 'block', marginBottom: '2px' }}>
                      {l}
                    </span>
                  ))}
              </p>
            ) : null}
            {SkillsBlock}
            {CertificationsBlock}
            {EducationBlock}
          </aside>
          <div style={{ minWidth: 0, flex: 1 }}>
            {SummaryBlock}
            {ExperienceBlock}
            {AdditionalBlock}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div id="resume-render" style={page}>
      {HeaderBlock}
      {SummaryBlock}
      {ExperienceBlock}
      {EducationBlock}
      {SkillsBlock}
      {CertificationsBlock}
      {AdditionalBlock}
    </div>
  )
}

/** Build a template component from a theme. */
export function makeTemplate(theme: TemplateTheme) {
  const Component = (props: GulfPremiumProps) => renderTemplate(theme, props)
  Component.displayName = 'ResumeTemplate'
  return Component
}
