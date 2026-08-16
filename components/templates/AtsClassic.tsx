import type { GulfPremiumProps } from './GulfPremium'
import { buildResumeDocument } from '@/lib/resumeDocument'
import { PAGE } from './tokens'

/**
 * ATS Classic — the most machine-readable template in the set (TASK-136).
 *
 * SAME DOCUMENT, DIFFERENT PRESENTATION. It takes the identical
 * `ResumeDocument` GulfPremium renders and shares its props type, so switching
 * templates changes nothing about the user's content. Every "what does the
 * document say" decision — visibility filtering, user-edited-beats-generated,
 * skill ordering, date formatting — already happened in
 * lib/resumeDocument.ts and is not repeated here.
 *
 * WHAT MAKES IT ATS-SAFE, and why each choice is deliberate rather than
 * decorative:
 *
 *  - ONE COLUMN, ONE FLOW. Parsers read the DOM in order. A sidebar reorders
 *    content unpredictably once flattened, which is how skills end up inside
 *    someone's job history.
 *  - CONVENTIONAL HEADINGS, spelled the way parsers match them: Professional
 *    Summary, Work Experience, Education, Skills, Certifications. Not
 *    "My Journey".
 *  - NO PHOTO, ever, whatever the profile holds. Many parsers drop the whole
 *    header block when it contains an image, taking the name and contact
 *    details with it. Gulf CVs often want a photo — that is what Gulf Premium
 *    is for. Choosing this template is choosing parseability.
 *  - NO ICONS, no glyph separators, no text inside graphics. A dot from an
 *    icon font extracts as a random character mid-line.
 *  - REAL <h1>/<h2> AND <ul>/<li>. The heading level and the list are the
 *    machine-readable structure; visual weight alone conveys nothing.
 *  - PLAIN " | " SEPARATORS in the contact line, which every parser splits on.
 *  - BLACK ON WHITE. Colour carries no information here, so nothing is lost
 *    when it is stripped.
 *
 * Inline styles only, no Tailwind — the PDF pipeline renders this through
 * renderToStaticMarkup with no stylesheet. Same hard constraint as every
 * template; see ./tokens.ts.
 */

const FONT = 'Georgia, "Times New Roman", Times, serif'
const INK = '#111111'
const MUTED = '#444444'
const RULE = '#999999'

const h2Style: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: '12.5pt',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: INK,
  margin: '16px 0 6px',
  paddingBottom: '3px',
  borderBottom: `1px solid ${RULE}`,
  // Never strand a heading at the foot of a page.
  pageBreakAfter: 'avoid',
  breakAfter: 'avoid',
}

const bodyStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: '10.5pt',
  lineHeight: 1.45,
  color: INK,
}

const entryStyle: React.CSSProperties = {
  marginBottom: '11px',
  pageBreakInside: 'avoid',
}

export default function AtsClassic({
  profile,
  optimizedContent,
  skillsOrder,
  fieldVisibility,
  document,
}: GulfPremiumProps) {
  const doc =
    document ?? buildResumeDocument({ profile, optimizedContent, skillsOrder, fieldVisibility })

  const { header, summary, experience, skills, certifications, education, additional } = doc

  // The contact line is rebuilt from the document's own parts with a plain
  // pipe separator — the header's visual grouping is a Gulf Premium idea, and
  // pipes are what parsers reliably split on.
  const contactLine = [header.identityPrimary, header.identityContact, header.identityGulf]
    .filter(Boolean)
    .join(' | ')

  return (
    <div
      id="resume-render"
      style={{
        width: PAGE.width,
        minHeight: PAGE.minHeight,
        padding: PAGE.padding,
        boxSizing: 'border-box',
        margin: '0 auto',
        background: '#FFFFFF',
        ...bodyStyle,
      }}
    >
      {/* Header: text only. No photo, by design — see the file comment. */}
      {header.hasHeaderText ? (
        <header style={{ marginBottom: '4px' }}>
          {header.displayName ? (
            <h1
              style={{
                fontFamily: FONT,
                fontSize: '19pt',
                fontWeight: 700,
                letterSpacing: '0.01em',
                color: INK,
                margin: 0,
              }}
            >
              {header.displayName}
            </h1>
          ) : null}
          {header.targetJobTitle ? (
            <p style={{ ...bodyStyle, fontSize: '11.5pt', margin: '2px 0 0', color: MUTED }}>
              {header.targetJobTitle}
            </p>
          ) : null}
          {contactLine ? (
            <p style={{ ...bodyStyle, fontSize: '9.5pt', margin: '5px 0 0', color: MUTED }}>
              {contactLine}
            </p>
          ) : null}
        </header>
      ) : null}

      {summary ? (
        <section>
          <h2 style={h2Style}>Professional Summary</h2>
          <p style={{ ...bodyStyle, margin: 0 }}>{summary}</p>
        </section>
      ) : null}

      {experience.length > 0 ? (
        <section>
          <h2 style={h2Style}>Work Experience</h2>
          {experience.map((item) => (
            <div key={item.entry.id} style={entryStyle}>
              <p style={{ ...bodyStyle, margin: 0, fontWeight: 700 }}>{item.entry.role}</p>
              {item.companyLine ? (
                <p style={{ ...bodyStyle, margin: '1px 0 0', fontSize: '10pt', color: MUTED }}>
                  {item.companyLine}
                </p>
              ) : null}
              {item.bullets.length > 0 ? (
                <ul style={{ margin: '4px 0 0', paddingLeft: '17px' }}>
                  {item.bullets.map((b, i) => (
                    <li key={i} style={{ ...bodyStyle, marginBottom: '2px' }}>
                      {b}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {education.length > 0 ? (
        <section>
          <h2 style={h2Style}>Education</h2>
          {education.map((item) => (
            <p key={item.entry.id} style={{ ...bodyStyle, margin: '0 0 4px' }}>
              {item.line}
              {item.years ? `, ${item.years}` : ''}
            </p>
          ))}
        </section>
      ) : null}

      {skills.length > 0 ? (
        <section>
          <h2 style={h2Style}>Skills</h2>
          {/* A comma-separated line, not a grid: multi-column skill layouts are
              a classic parser trap, flattening into interleaved nonsense. */}
          <p style={{ ...bodyStyle, margin: 0 }}>{skills.map((s) => s.name).join(', ')}</p>
        </section>
      ) : null}

      {certifications.length > 0 ? (
        <section>
          <h2 style={h2Style}>Certifications</h2>
          <ul style={{ margin: 0, paddingLeft: '17px' }}>
            {certifications.map((item) => (
              <li key={item.entry.id} style={{ ...bodyStyle, marginBottom: '2px' }}>
                {item.display}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {additional.length > 0 ? (
        <section>
          <h2 style={h2Style}>Additional Information</h2>
          <ul style={{ margin: 0, paddingLeft: '17px' }}>
            {additional.map((item) => (
              <li key={item.entry.id} style={{ ...bodyStyle, marginBottom: '2px' }}>
                {item.display}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
