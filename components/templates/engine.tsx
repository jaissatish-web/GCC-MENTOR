import type { GulfPremiumProps } from './GulfPremium'
import { buildResumeDocument, type ResumeDocument, type ResumeContactItem } from '@/lib/resumeDocument'
import { PAGE } from './tokens'
import { applyStyleOverrides } from '@/lib/resumeStyle'

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
  /**
   * Full-bleed coloured rail running the whole page height, text reversed out
   * of it, photo inside it (TASK-149). The layout the commercial builders are
   * recognised by: supporting facts in the rail, summary and experience in the
   * main column.
   *
   * THE MAIN COLUMN IS FIRST IN THE MARKUP, and the rail is positioned by
   * `flex-direction` (TASK-151). The first version emitted the rail first, which
   * measured out as a parser reading "Saudi · Riyadh" before the candidate's
   * name — found by dumping `innerText` rather than by reading the JSX. Emitting
   * the name first costs nothing visually and fixes that.
   */
  | 'sidebar-filled'

export type SkillStyle =
  /** One line, " · " separated. Densest, and the safest to parse. */
  | 'inline'
  /**
   * Individual pills. Deliberately NOT bars or dots: this product does not
   * collect a proficiency level for a skill, so any bar would be inventing one
   * — the exact fabrication the grounding rule forbids (docs/RULES.md). A pill
   * asserts only "this skill is listed", which is all we actually know.
   */
  | 'chips'

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
  /**
   * Full-bleed colour block behind the name and title (TASK-149). Reverses the
   * name to white and is the single strongest way to make one template
   * recognisable from another at thumbnail size.
   */
  headerBand?: boolean
  /** Circular crop on the photo. Reads modern; rectangular reads formal/Gulf. */
  photoShape?: 'rect' | 'circle'
  /**
   * Which side the photo sits on (TASK-151).
   *
   * Implemented as `flex-direction: row-reverse`, never by reordering the JSX,
   * so the left and right variants emit **identical markup** and differ only in
   * paint order. The image also carries `alt=""` — it is decorative, the person's
   * name is already the <h1> — so it contributes no text and the first thing a
   * parser reads is the name either way.
   */
  photoSide?: 'left' | 'right'
  /** Which side the filled rail sits on. Same row-reverse reasoning. */
  sidebarSide?: 'left' | 'right'
  /** Defaults to 'inline' so every existing theme is unchanged. */
  skillStyle?: SkillStyle
  /**
   * Draw a glyph beside each contact fact instead of joining them with " · ".
   * Needs `header.contactItems`, which pre-TASK-149 snapshots do not carry —
   * the renderer falls back to the joined lines when it is absent.
   */
  contactIcons?: boolean
  /**
   * Multiplier on the photo's dimensions (TASK-158). 1 = the size the template
   * was designed with. Driven by the user's slider via applyStyleOverrides.
   */
  photoScale?: number
  /**
   * Explicit photo on/off, driven by the user's toggle via applyStyleOverrides
   * (2026-08-19). Undefined/true = show it if the template and the document
   * otherwise would; false = hide it regardless. Layered on TOP of
   * `allowPhoto` and the document's own `header.showPhoto` — this can only
   * ever remove a photo that would otherwise render, never add one a
   * photo-less template or a photo-less resume doesn't have.
   */
  photoVisible?: boolean
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

/** Usable width inside the filled rail: 238px wide, 22px padding each side. */
const RAIL_CONTENT_W = 194

function pt(n: number): string {
  return `${Math.round(n * 100) / 100}pt`
}

/**
 * Contact glyphs (TASK-149).
 *
 * INLINE SVG, not an icon library and not a font. The PDF pipeline renders this
 * tree through `renderToStaticMarkup` with no stylesheet and no network, so an
 * icon font would arrive as tofu and a CDN sprite would not arrive at all —
 * the same constraint that forces inline styles throughout this folder. These
 * are single paths at 1.4 stroke, sized in em so they scale with their label.
 *
 * `aria-hidden` on every one: the text beside it already says what it is, and a
 * screen reader announcing "phone phone" is worse than silence. This also keeps
 * an ATS parser reading the text only — the glyph adds no words to the document.
 */
const ICON_PATHS: Record<ResumeContactItem['kind'], string> = {
  phone: 'M4 2h3l1.5 4L6.5 7.2a9 9 0 004.3 4.3L12 9.5 16 11v3a1 1 0 01-1.1 1A13 13 0 013 4.1 1 1 0 014 2z',
  whatsapp: 'M3 17l1.2-3.4A7 7 0 1110 17a7 7 0 01-3.4-.9L3 17z',
  email: 'M2 5h16v10H2zM2 5l8 6 8-6',
  location: 'M10 18s6-5.3 6-10a6 6 0 10-12 0c0 4.7 6 10 6 10z M10 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  linkedin: 'M3 7h3v10H3zM4.5 3.5a1.6 1.6 0 100 3.2 1.6 1.6 0 000-3.2zM9 17V7h3v1.4A3.4 3.4 0 0117 11v6h-3v-5a1.6 1.6 0 00-3.2 0v5z',
  nationality: 'M10 18a8 8 0 100-16 8 8 0 000 16zM2 10h16M10 2a12 12 0 010 16 12 12 0 010-16z',
  visa: 'M3 4h14v12H3zM3 8h14M7 12h4',
  passport: 'M5 2h9a1 1 0 011 1v14a1 1 0 01-1 1H5zM8 6.5h5',
  dob: 'M3 5h14v12H3zM3 9h14M7 3v3M13 3v3',
  notice: 'M10 18a8 8 0 100-16 8 8 0 000 16zM10 6v4.3l3 1.8',
}

function ContactIcon({ kind, color }: { kind: ResumeContactItem['kind']; color: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      style={{
        width: '1em',
        height: '1em',
        flexShrink: 0,
        // Optical alignment: a glyph sitting on the text baseline reads high
        // against lowercase, so it is nudged down by a fraction of its size.
        marginTop: '0.15em',
        fill: 'none',
        stroke: color,
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }}
    >
      <path d={ICON_PATHS[kind]} />
    </svg>
  )
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

function bodyStyle(theme: TemplateTheme): React.CSSProperties {
  return {
    fontFamily: theme.bodyFont,
    fontSize: pt(theme.bodySize),
    lineHeight: 1.28 + 0.16 * theme.density,
    color: theme.ink,
  }
}

/**
 * Skills and simple lists as standalone renderers.
 *
 * Extracted (TASK-149) so the filled sidebar can draw the same sections against
 * a reversed-out theme without a second copy of the markup. A duplicate would be
 * a second place for a skills bug to live — the same reasoning that keeps one
 * TemplatePicker for two layouts.
 */
function renderSkills(
  theme: TemplateTheme,
  skills: ResumeDocument['skills'],
  title: string,
): React.JSX.Element {
  const body = bodyStyle(theme)
  return (
    <Section theme={theme} title={title}>
      {theme.skillStyle === 'chips' ? (
        // Pills, never bars — see the SkillStyle note. No proficiency is claimed.
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {skills.map((s) => (
            <span
              key={s.id}
              style={{
                ...body,
                fontSize: pt(theme.bodySize - 0.6),
                background: theme.accentSoft,
                color: theme.ink,
                border: `1px solid ${theme.rule}`,
                borderRadius: '9px',
                padding: '1px 7px',
                whiteSpace: 'nowrap',
              }}
            >
              {s.name}
            </span>
          ))}
        </div>
      ) : (
        <p style={{ ...body, margin: 0 }}>{skills.map((s) => s.name).join(' · ')}</p>
      )}
    </Section>
  )
}

function renderList(theme: TemplateTheme, items: string[], title: string): React.JSX.Element {
  const body = bodyStyle(theme)
  return (
    <Section theme={theme} title={title}>
      <ul style={{ margin: 0, paddingLeft: '16px' }}>
        {items.map((text, i) => (
          <li key={i} style={{ ...body, marginBottom: `${2 * theme.density}px` }}>
            {text}
          </li>
        ))}
      </ul>
    </Section>
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
  const showPhoto = theme.allowPhoto && header.showPhoto && !!header.photoUrl && theme.photoVisible !== false

  const contactLine = [header.identityPrimary, header.identityContact, header.identityGulf]
    .filter(Boolean)
    .join('  |  ')

  const contactItems = header.contactItems ?? []
  /** Icons need the unjoined items; a pre-TASK-149 snapshot has none. */
  const useIcons = Boolean(theme.contactIcons) && contactItems.length > 0

  const photoRadius = theme.photoShape === 'circle' ? '50%' : '2px'
  const photoScale = theme.photoScale ?? 1

  /** Contact facts stacked one per line, each with its glyph. */
  const ContactList = ({ color, muted }: { color: string; muted: string }) =>
    useIcons ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {contactItems.map((item) => (
          <span
            key={item.kind + item.text}
            style={{
              ...body,
              fontSize: pt(theme.bodySize - 0.8),
              color: muted,
              display: 'flex',
              gap: '5px',
              alignItems: 'flex-start',
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            <ContactIcon kind={item.kind} color={color} />
            <span style={{ minWidth: 0 }}>{item.text}</span>
          </span>
        ))}
      </div>
    ) : (
      // Fallback: the joined lines, exactly as every pre-TASK-149 template drew
      // them. An old snapshot must still render, not render blank.
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {[header.identityPrimary, header.identityContact, header.identityGulf]
          .filter(Boolean)
          .map((line, i) => (
            <span
              key={i}
              style={{ ...body, fontSize: pt(theme.bodySize - 0.8), color: muted, wordBreak: 'break-word' }}
            >
              {line}
            </span>
          ))}
      </div>
    )

  const HeaderBlock = header.hasHeaderText ? (
    <header
      style={{
        display: 'flex',
        // row-reverse, not a reordered DOM: the name stays first in the markup
        // so a parser reads it first whatever the photo does visually.
        flexDirection: theme.photoSide === 'right' ? 'row-reverse' : 'row',
        gap: '14px',
        alignItems: 'flex-start',
        marginBottom: `${6 * theme.density}px`,
      }}
    >
      {showPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={header.photoUrl as string}
          alt=""
          style={{
            width: `${Math.round(72 * photoScale)}px`,
            height: `${Math.round(90 * photoScale)}px`,
            objectFit: 'cover',
            borderRadius: photoRadius,
            flexShrink: 0,
          }}
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
          useIcons ? (
            // A single-column theme with icons on but no colour band still has
            // to draw them here — this branch was missed on the first pass and
            // caught by counting <svg> in the exported render, not by reading.
            <div style={{ marginTop: '5px' }}>
              <ContactList color={theme.accent} muted={theme.muted} />
            </div>
          ) : (
            <p style={{ ...body, fontSize: pt(theme.bodySize - 0.8), color: theme.muted, margin: '4px 0 0' }}>
              {contactLine}
            </p>
          )
        ) : null}
      </div>
    </header>
  ) : null

  const ExperienceBlock =
    experience.length > 0 ? (
      <Section theme={theme} title={label('experience')}>
        {experience.map((item) => (
          <div key={item.entry.id} style={{ marginBottom: `${9 * theme.density}px`, pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
              <p style={{ ...body, margin: 0, fontWeight: 700 }}>{item.entry.role}</p>
              {item.range ? (
                <span
                  style={{
                    ...body,
                    fontSize: pt(theme.bodySize - 0.5),
                    color: theme.muted,
                    whiteSpace: 'nowrap',
                    flex: 'none',
                  }}
                >
                  {item.range}
                </span>
              ) : null}
            </div>
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

  const SkillsBlock = skills.length > 0 ? renderSkills(theme, skills, label('skills')) : null

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

  /**
   * Full-bleed colour block behind the name (TASK-149).
   *
   * Full-bleed means escaping the page's own padding, so it uses a negative
   * margin equal to that padding rather than a second, padding-free page
   * variant — one page box, one source of truth for the A4 geometry.
   */
  const BandHeader = header.hasHeaderText ? (
    <header
      style={{
        background: theme.accent,
        margin: `-${PAGE.padding.split(' ')[0]} -${PAGE.padding.split(' ')[1]} ${16 * theme.density}px`,
        padding: `${20 * theme.density}px ${PAGE.padding.split(' ')[1]}`,
        display: 'flex',
        flexDirection: theme.photoSide === 'right' ? 'row-reverse' : 'row',
        gap: '16px',
        alignItems: 'center',
      }}
    >
      {showPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={header.photoUrl as string}
          alt=""
          style={{
            width: `${Math.round(76 * photoScale)}px`,
            height: `${Math.round((theme.photoShape === 'circle' ? 76 : 94) * photoScale)}px`,
            objectFit: 'cover',
            borderRadius: photoRadius,
            flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.85)',
          }}
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
              color: '#FFFFFF',
              margin: 0,
              lineHeight: 1.14,
            }}
          >
            {header.displayName}
          </h1>
        ) : null}
        {header.targetJobTitle ? (
          <p
            style={{
              ...body,
              fontSize: pt(theme.bodySize + 1.2),
              color: 'rgba(255,255,255,0.88)',
              margin: '3px 0 0',
              fontWeight: 600,
            }}
          >
            {header.targetJobTitle}
          </p>
        ) : null}
        {contactLine ? (
          <div style={{ marginTop: '6px' }}>
            <ContactList color="rgba(255,255,255,0.9)" muted="rgba(255,255,255,0.88)" />
          </div>
        ) : null}
      </div>
    </header>
  ) : null

  if (theme.layout === 'sidebar-filled') {
    // The rail runs the full page height, so the page itself carries no padding
    // and each column pads its own content. Supporting facts left, narrative
    // right — identical document order to `sidebar`, so flattening for a parser
    // still yields a sane read.
    const railInk = '#FFFFFF'
    const railMuted = 'rgba(255,255,255,0.86)'
    return (
      <div
        id="resume-render"
        style={{
          ...page,
          padding: 0,
          display: 'flex',
          // DOM order below is MAIN COLUMN FIRST, so the candidate's name is the
          // first text on the page for a parser. The visual side is then set
          // here: 'row' puts the main column left and the rail right, so a rail
          // on the LEFT needs the reverse.
          //
          // Absence means LEFT, deliberately: Technical Sidebar shipped in
          // TASK-149 with a left rail and does not set this field, and inverting
          // the default silently moved it — caught by measuring after the DOM
          // swap, not by reading.
          flexDirection: theme.sidebarSide === 'right' ? 'row' : 'row-reverse',
          alignItems: 'stretch',
        }}
      >
        <div style={{ minWidth: 0, flex: 1, padding: '30px 30px 30px 26px', boxSizing: 'border-box' }}>
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
                lineHeight: 1.14,
              }}
            >
              {header.displayName}
            </h1>
          ) : null}
          {header.targetJobTitle ? (
            <p
              style={{
                ...body,
                fontSize: pt(theme.bodySize + 1.4),
                color: theme.accent,
                margin: '3px 0 0',
                fontWeight: 600,
              }}
            >
              {header.targetJobTitle}
            </p>
          ) : null}
          {SummaryBlock}
          {ExperienceBlock}
          {AdditionalBlock}
        </div>
        <aside
          style={{
            width: '238px',
            flexShrink: 0,
            background: theme.accent,
            color: railInk,
            padding: '30px 22px',
            boxSizing: 'border-box',
          }}
        >
          {showPhoto ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={header.photoUrl as string}
              alt=""
              style={{
                // A rect photo in the rail spans the rail's width, so only its
                // height responds to the slider; a circle scales both.
                // Capped to the rail's own content width (238px rail minus 22px
                // padding each side). Without the cap the widened slider range
                // (TASK-159) pushed a 2.4x circle to 269px inside a 194px column
                // and it bled over the rail edge.
                width:
                  theme.photoShape === 'circle'
                    ? `${Math.min(RAIL_CONTENT_W, Math.round(112 * photoScale))}px`
                    : '100%',
                height:
                  theme.photoShape === 'circle'
                    ? `${Math.min(RAIL_CONTENT_W, Math.round(112 * photoScale))}px`
                    : `${Math.round(132 * photoScale)}px`,
                objectFit: 'cover',
                borderRadius: photoRadius,
                display: 'block',
                margin: theme.photoShape === 'circle' ? '0 auto 16px' : '0 0 16px',
                border: '2px solid rgba(255,255,255,0.85)',
              }}
            />
          ) : null}
          {contactLine ? (
            <div style={{ marginBottom: `${14 * theme.density}px` }}>
              <ContactList color={railInk} muted={railMuted} />
            </div>
          ) : null}
          {/* Reversed out of the rail, these sections need the rail's own ink,
              so they are rendered against a theme whose text colours are white
              rather than restyled ad hoc at each call site. */}
          {(() => {
            const railTheme: TemplateTheme = {
              ...theme,
              ink: railInk,
              muted: railMuted,
              accent: railInk,
              rule: 'rgba(255,255,255,0.35)',
              accentSoft: 'rgba(255,255,255,0.14)',
              headingStyle: theme.headingStyle === 'band' ? 'rule' : theme.headingStyle,
            }
            return (
              <>
                {skills.length > 0 ? renderSkills(railTheme, skills, label('skills')) : null}
                {certifications.length > 0
                  ? renderList(railTheme, certifications.map((c) => c.display), label('certifications'))
                  : null}
                {education.length > 0
                  ? renderList(
                      railTheme,
                      education.map((e) => e.line + (e.years ? `, ${e.years}` : '')),
                      label('education'),
                    )
                  : null}
              </>
            )
          })()}
        </aside>
      </div>
    )
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
      {theme.headerBand ? BandHeader : HeaderBlock}
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
  // The user's font/size/accent choices are applied here, once, producing a new
  // theme per render (TASK-152). `applyStyleOverrides` is pure: the module-level
  // theme object is shared by every request and must never be mutated, or one
  // user's colour choice would leak into the next person's PDF.
  const Component = (props: GulfPremiumProps) =>
    renderTemplate(applyStyleOverrides(theme, props.styleOverrides), props)
  Component.displayName = 'ResumeTemplate'
  return Component
}
