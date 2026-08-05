// GulfPhotoHeader — Dark header with circular photo and two-column body
// Must render identically in browser and Puppeteer
// Width: 794px (A4 at 96 DPI), min-height: 1123px
// Uses only inline styles — zero Tailwind classes

import type { ResumeData } from '@/lib/resumeTypes'
import { isLight } from '@/lib/styleTypes'

interface Props {
  resumeData: ResumeData
  themeColor?: string
  highlightColor?: string
  textColor?: string
  fontFamily?: string
  accentColor?: string
  nameFontSize?: number
  headingFontSize?: number
  bodyFontSize?: number
}

export default function GulfPhotoHeader({ resumeData, themeColor, highlightColor, textColor, fontFamily, accentColor, nameFontSize, headingFontSize, bodyFontSize }: Props) {
  const primary = themeColor ?? '#2C2C2C'
  const highlight = highlightColor ?? `${primary}15`
  const accent          = accentColor ?? (themeColor ?? '#2C2C2C')
  const nameSize        = nameFontSize ?? 22
  const hSize           = headingFontSize ?? 11
  const bSize           = bodyFontSize ?? 9
  const headerTextColor = isLight(themeColor ?? '#2C2C2C') ? '#1a1a1a' : '#ffffff'
  const {
    personal = {},
    gulf_fields = {},
    summary_text = '',
    experience_data = [],
    education_data = [],
    skills_data = {},
    certifications_data = [],
    projects_data = [],
    block_visibility = {},
  } = resumeData as ResumeData & { [key: string]: unknown }

  const p = personal as ResumeData['personal']
  const g = gulf_fields as ResumeData['gulf_fields']
  const exp = experience_data as ResumeData['experience_data']
  const edu = education_data as ResumeData['education_data']
  const skills = skills_data as ResumeData['skills_data']
  const certs = certifications_data as ResumeData['certifications_data']
  const projs = projects_data as ResumeData['projects_data']

  const isVisible = (block: string) => (block_visibility as Record<string, boolean>)[block] !== false

  const formatDate = (d: string) => {
    if (!d) return ''
    if (d === 'present') return 'Present'
    if (d.includes('-')) {
      const [y, m] = d.split('-')
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${months[parseInt(m) - 1] || ''} ${y}`
    }
    return d
  }

  const initials = (p.full_name || 'N A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const firstJobTitle = exp.length > 0 ? exp[0].job_title : ''

  const gulfBadges = [
    g.visa_status && `Visa: ${g.visa_status}`,
    g.notice_period && `Notice: ${g.notice_period}`,
    g.gcc_driving_licence && g.gcc_driving_licence !== 'None' && `Licence: ${g.gcc_driving_licence}`,
    g.expected_salary && `Expected: ${g.expected_salary}`,
    g.current_location && `Location: ${g.current_location}`,
    (g.target_countries || []).length > 0 && `Open to: ${(g.target_countries || []).join(', ')}`,
  ].filter(Boolean) as string[]

  const sectionTitle: React.CSSProperties = {
    fontSize: `${hSize}px`,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: accent,
    borderBottom: `1.5px solid ${accent}`,
    paddingBottom: '3px',
    marginBottom: '8px',
    marginTop: '16px',
  }

  const allSkills = [
    ...(skills.technical || []),
    ...(skills.software || []),
    ...(skills.soft || []),
    ...(skills.standards || []),
  ]

  return (
    <div
      id="resume-render"
      style={{
        width: '794px',
        minHeight: '1123px',
        backgroundColor: '#ffffff',
        fontFamily: fontFamily ?? 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
        lineHeight: '1.45',
        color: textColor ?? '#1a1a1a',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── DARK HEADER ── */}
      <div style={{
        backgroundColor: primary,
        minHeight: '130px',
        display: 'flex',
        alignItems: 'center',
        padding: '20px 24px',
        gap: '20px',
      }}>
        {/* Circular photo */}
        <div style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '3px solid rgba(255,255,255,0.3)',
          backgroundColor: '#555555',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {p.photo_url
            ? <img src={p.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: isLight(themeColor ?? '#2C2C2C') ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)', fontSize: '24px', fontWeight: '700' }}>{initials}</span>
          }
        </div>

        {/* Name + title */}
        <div>
          <div style={{ color: headerTextColor, fontSize: `${nameSize}px`, fontWeight: '700', lineHeight: '1.2', marginBottom: '5px' }}>
            {p.full_name || 'Full Name'}
          </div>
          {firstJobTitle && (
            <div style={{ color: isLight(themeColor ?? '#2C2C2C') ? 'rgba(0,0,0,0.6)' : '#B0B8C4', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              {firstJobTitle}
            </div>
          )}
        </div>
      </div>

      {/* ── CONTACT BAR ── */}
      <div style={{
        backgroundColor: '#F5F5F5',
        padding: '7px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px',
        fontSize: '9.5px',
        color: '#444',
      }}>
        {p.phone && <span>☎ {p.phone}</span>}
        {p.email && <span>✉ {p.email}</span>}
        {p.address && <span>📍 {p.address}</span>}
        {p.nationality && <span>🌐 {p.nationality}</span>}
        {p.date_of_birth && <span>DOB: {p.date_of_birth}</span>}
        {p.marital_status && <span>{p.marital_status}</span>}
      </div>

      {/* ── GULF FIELDS STRIP ── */}
      {isVisible('gulf_fields') && gulfBadges.length > 0 && (
        <div style={{
          background: highlight,
          padding: '5px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          fontSize: `${bSize}px`,
          color: (highlight.length > 7 || isLight(highlight)) ? accent : '#ffffff',
          fontWeight: '600',
        }}>
          {gulfBadges.map((badge, i) => (
            <span key={i}>◆ {badge}</span>
          ))}
        </div>
      )}

      {/* ── TWO-COLUMN BODY ── */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* LEFT column */}
        <div style={{
          width: '210px',
          flexShrink: 0,
          backgroundColor: '#FAFAFA',
          padding: '18px',
          borderRight: '1px solid #E5E7EB',
        }}>

          {/* ABOUT ME */}
          {isVisible('summary') && summary_text && (
            <>
              <div style={sectionTitle}>About Me</div>
              <p style={{ fontSize: `${bSize}px`, color: '#374151', lineHeight: '1.55', marginBottom: '4px' }}>{summary_text}</p>
            </>
          )}

          {/* EDUCATION */}
          {isVisible('education') && edu.length > 0 && (
            <>
              <div style={sectionTitle}>Education</div>
              {edu.map((e, i) => (
                <div key={e.id || i} style={{ marginBottom: '9px', pageBreakInside: 'avoid' }}>
                  <div style={{ fontWeight: '700', fontSize: `${hSize}px`, color: '#1a1a1a', lineHeight: '1.3' }}>{e.degree}</div>
                  <div style={{ fontSize: `${bSize}px`, color: '#6B7280', lineHeight: '1.3' }}>{e.institution}</div>
                  {e.year && <div style={{ fontSize: `${bSize}px`, color: '#9CA3AF' }}>{e.year}</div>}
                </div>
              ))}
            </>
          )}

          {/* SKILLS */}
          {isVisible('skills') && allSkills.length > 0 && (
            <>
              <div style={sectionTitle}>Skills</div>
              {allSkills.map((skill, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9.5px', color: '#374151' }}>
                  <span>{skill}</span>
                  <span style={{ color: '#D1D5DB', fontSize: '9px', letterSpacing: '1px' }}>———</span>
                </div>
              ))}
            </>
          )}

          {/* LANGUAGES */}
          <div>
            <div style={sectionTitle}>Languages</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9.5px', color: '#374151' }}>
              <span>English</span>
              <span style={{ color: '#D1D5DB', fontSize: '9px', letterSpacing: '1px' }}>———</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9.5px', color: '#374151' }}>
              <span>Arabic</span>
              <span style={{ color: '#D1D5DB', fontSize: '9px', letterSpacing: '1px' }}>———</span>
            </div>
          </div>

        </div>

        {/* RIGHT column */}
        <div style={{ flex: 1, padding: '18px 28px', minWidth: 0 }}>

          {/* EXPERIENCE */}
          {isVisible('experience') && exp.length > 0 && (
            <>
              <div style={{ ...sectionTitle, marginTop: '0' }}>Experience</div>
              {exp.map((e, i) => (
                <div key={e.id || i} style={{ marginBottom: '12px', pageBreakInside: 'avoid' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '10px', color: primary, flexShrink: 0 }}>○</span>
                      <span style={{ fontWeight: '700', fontSize: '11px', color: '#1a1a1a' }}>{e.job_title}</span>
                    </div>
                    <span style={{ fontSize: '9.5px', color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '8px' }}>
                      {formatDate(e.start_date)}{e.start_date ? ' – ' : ''}{formatDate(e.end_date)}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px', marginLeft: '15px' }}>
                    {e.company}{e.location ? ` · ${e.location}` : ''}
                  </div>
                  {(e.highlights || []).filter(Boolean).map((h, hi) => (
                    <div key={hi} style={{ display: 'flex', gap: '5px', marginBottom: '2px', fontSize: '10px', color: '#374151', marginLeft: '15px' }}>
                      <span style={{ flexShrink: 0 }}>•</span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {/* CERTIFICATIONS */}
          {isVisible('certifications') && certs.length > 0 && (
            <>
              <div style={sectionTitle}>Certifications</div>
              {certs.map((c, i) => (
                <div key={c.id || i} style={{ marginBottom: '6px', pageBreakInside: 'avoid' }}>
                  <div style={{ fontWeight: '700', fontSize: '10.5px', color: '#1a1a1a' }}>{c.name}</div>
                  <div style={{ fontSize: '9.5px', color: '#6B7280' }}>
                    {c.issuer && `${c.issuer}`}{c.year && ` · ${c.year}`}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* KEY PROJECTS */}
          {isVisible('projects') && projs.length > 0 && (
            <>
              <div style={sectionTitle}>Key Projects</div>
              {projs.map((pr, i) => (
                <div key={pr.id || i} style={{ marginBottom: '8px', pageBreakInside: 'avoid' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                    <span style={{ fontWeight: '700', fontSize: '11px', color: '#1a1a1a' }}>{pr.name}</span>
                    {pr.value && <span style={{ fontSize: '9.5px', color: '#9CA3AF', whiteSpace: 'nowrap', marginLeft: '8px' }}>{pr.value}</span>}
                  </div>
                  {(pr.client || pr.role) && (
                    <div style={{ fontSize: '10px', color: primary, marginBottom: '3px' }}>
                      {pr.client && `Client: ${pr.client}`}{pr.role && ` · Role: ${pr.role}`}
                    </div>
                  )}
                  {pr.description && <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.5' }}>{pr.description}</div>}
                </div>
              ))}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
