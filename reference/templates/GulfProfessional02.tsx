// GulfProfessional02 — Two-column Gulf CV Template
// Teal header, sidebar (left) + main content (right)
// Width: 794px (A4 at 96 DPI). Uses only inline styles for Puppeteer safety.

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

export default function GulfProfessional02({ resumeData, themeColor, highlightColor, textColor, fontFamily, accentColor, nameFontSize, headingFontSize, bodyFontSize }: Props) {
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

  const TEAL = themeColor ?? '#0D9488'
  const TEAL_DARK = themeColor ?? '#0F766E'
  const SIDEBAR_BG = highlightColor ?? (themeColor ? `${themeColor}22` : '#0F2B28')
  const accent   = accentColor ?? TEAL
  const nameSize = nameFontSize ?? 20
  const hSize    = headingFontSize ?? 11
  const bSize    = bodyFontSize ?? 9
  const headerTextColor = isLight(TEAL_DARK) ? '#1a1a1a' : '#ffffff'
  const headerSubColor  = isLight(TEAL_DARK) ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.82)'
  const sidebarTextColor = isLight(SIDEBAR_BG) ? '#1a1a1a' : '#ffffff'
  const photoBorderColor = isLight(SIDEBAR_BG) ? accent : `${accent}80`
  const photoBgColor     = isLight(SIDEBAR_BG) ? '#E5E7EB' : `${TEAL}40`

  const s = {
    page: {
      width: '794px',
      minHeight: '1123px',
      backgroundColor: '#ffffff',
      fontFamily: fontFamily ?? 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      lineHeight: '1.45',
      color: textColor ?? '#1a1a1a',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column' as const,
    } as React.CSSProperties,
    header: {
      backgroundColor: TEAL_DARK,
      color: headerTextColor,
      padding: '24px 28px 20px',
    } as React.CSSProperties,
    name: {
      fontSize: `${nameSize}px`,
      fontWeight: '700',
      letterSpacing: '0.5px',
      marginBottom: '2px',
    } as React.CSSProperties,
    jobTitle: {
      fontSize: '12px',
      color: headerSubColor,
      fontWeight: '500',
    } as React.CSSProperties,
    columns: {
      display: 'flex',
      flex: 1,
    } as React.CSSProperties,
    sidebar: {
      width: '220px',
      flexShrink: 0,
      backgroundColor: SIDEBAR_BG,
      color: sidebarTextColor,
      padding: '20px 16px',
    } as React.CSSProperties,
    main: {
      flex: 1,
      padding: '20px 24px',
      backgroundColor: '#ffffff',
    } as React.CSSProperties,
    sideSection: {
      marginBottom: '18px',
    } as React.CSSProperties,
    sideSectionTitle: {
      fontSize: `${hSize}px`,
      fontWeight: '700',
      textTransform: 'uppercase' as const,
      letterSpacing: '1.5px',
      color: accent,
      marginBottom: '8px',
      borderBottom: `1px solid ${accent}`,
      paddingBottom: '3px',
      pageBreakInside: 'avoid' as const,
    } as React.CSSProperties,
    contactItem: {
      fontSize: `${bSize}px`,
      color: sidebarTextColor,
      marginBottom: '4px',
      wordBreak: 'break-word' as const,
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: `${hSize}px`,
      fontWeight: '700',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      color: accent,
      borderBottom: `2px solid ${accent}`,
      paddingBottom: '3px',
      marginBottom: '10px',
      marginTop: '16px',
    } as React.CSSProperties,
    expHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: '2px',
    } as React.CSSProperties,
    expTitle: {
      fontWeight: '700',
      fontSize: '11px',
    } as React.CSSProperties,
    date: {
      fontSize: '9.5px',
      color: '#6B7280',
      whiteSpace: 'nowrap' as const,
    } as React.CSSProperties,
    company: {
      fontSize: '10px',
      color: '#374151',
      marginBottom: '4px',
    } as React.CSSProperties,
    bullet: {
      display: 'flex',
      gap: '5px',
      marginBottom: '2px',
      fontSize: `${bSize}px`,
      color: '#374151',
    } as React.CSSProperties,
    tag: {
      display: 'inline-block',
      backgroundColor: `${TEAL}20`,
      color: isLight(TEAL) ? '#374151' : accent,
      fontSize: `${bSize}px`,
      padding: '1px 5px',
      borderRadius: '3px',
      margin: '1px 2px 1px 0',
    } as React.CSSProperties,
    gulfItem: {
      fontSize: `${bSize}px`,
      color: sidebarTextColor,
      marginBottom: '4px',
      display: 'flex',
      gap: '5px',
      pageBreakInside: 'avoid' as const,
    } as React.CSSProperties,
  }

  const initials = (p.full_name || 'N A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const firstJobTitle = exp.length > 0 ? exp[0].job_title : ''

  const allSkills = [
    ...(skills.technical || []),
    ...(skills.software || []),
    ...(skills.standards || []),
    ...(skills.soft || []),
  ]

  return (
    <div id="resume-render" style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.name}>{p.full_name || 'Full Name'}</div>
        {firstJobTitle && <div style={s.jobTitle}>{firstJobTitle}</div>}
        {(p.nationality || p.marital_status) && (
          <div style={{ fontSize: '10px', color: headerSubColor, opacity: 0.85, marginBottom: '2px' }}>
            {[p.nationality, p.marital_status].filter(Boolean).join(' · ')}
          </div>
        )}
        <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' as const }}>
          {p.email && <span style={{ fontSize: '10px', color: headerSubColor }}>{p.email}</span>}
          {p.phone && <span style={{ fontSize: '10px', color: headerSubColor }}>{p.phone}</span>}
          {p.address && <span style={{ fontSize: '10px', color: headerSubColor }}>{p.address}</span>}
        </div>
      </div>

      {/* Two columns */}
      <div style={s.columns}>
        {/* Sidebar */}
        <div style={s.sidebar}>
          {/* Photo at top of sidebar */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: `3px solid ${photoBorderColor}`,
              backgroundColor: photoBgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {p.photo_url
                ? <img src={p.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '24px', fontWeight: '700' }}>{initials}</span>
              }
            </div>
          </div>

          {/* Gulf Fields */}
          {isVisible('gulf_fields') && (
            <div style={s.sideSection}>
              <div style={s.sideSectionTitle}>Gulf Profile</div>
              {g.visa_status && <div style={s.gulfItem}><span style={{ color: accent }}>▸</span><span>Visa: {g.visa_status}</span></div>}
              {g.notice_period && <div style={s.gulfItem}><span style={{ color: accent }}>▸</span><span>Notice: {g.notice_period}</span></div>}
              {g.expected_salary && <div style={s.gulfItem}><span style={{ color: accent }}>▸</span><span>Salary: {g.expected_salary}</span></div>}
              {g.iqama_transferable !== null && g.iqama_transferable !== undefined && (
                <div style={s.gulfItem}><span style={{ color: accent }}>▸</span><span>Iqama: {g.iqama_transferable ? 'Transferable' : 'Not transferable'}</span></div>
              )}
              {g.noc_available !== null && g.noc_available !== undefined && (
                <div style={s.gulfItem}><span style={{ color: accent }}>▸</span><span>NOC: {g.noc_available ? 'Available' : 'Not available'}</span></div>
              )}
              {g.gcc_driving_licence && g.gcc_driving_licence !== 'None' && (
                <div style={s.gulfItem}><span style={{ color: accent }}>▸</span><span>Licence: {g.gcc_driving_licence}</span></div>
              )}
              {g.accommodation_pref && <div style={s.gulfItem}><span style={{ color: accent }}>▸</span><span>Accommodation: {g.accommodation_pref}</span></div>}
              {(g.target_countries || []).length > 0 && (
                <div style={s.gulfItem}><span style={{ color: accent }}>▸</span><span>Open to: {(g.target_countries || []).join(', ')}</span></div>
              )}
            </div>
          )}

          {/* Personal */}
          {p.date_of_birth && (
            <div style={s.sideSection}>
              <div style={s.sideSectionTitle}>Personal</div>
              {p.date_of_birth && <div style={s.contactItem}>DOB: {p.date_of_birth}</div>}
            </div>
          )}

          {/* Skills */}
          {isVisible('skills') && allSkills.length > 0 && (
            <div style={s.sideSection}>
              <div style={s.sideSectionTitle}>Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const }}>
                {allSkills.map((skill, i) => (
                  <span key={i} style={{ ...s.tag, backgroundColor: `${TEAL}15`, display: 'block', margin: '2px 2px 2px 0', fontSize: '9px', padding: '2px 5px' }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {isVisible('certifications') && certs.length > 0 && (
            <div style={s.sideSection}>
              <div style={s.sideSectionTitle}>Certifications</div>
              {certs.map((c, i) => (
                <div key={c.id || i} style={{ marginBottom: '6px', pageBreakInside: 'avoid' as const }}>
                  <div style={{ fontSize: `${bSize}px`, fontWeight: '700', color: sidebarTextColor }}>{c.name}</div>
                  {(c.issuer || c.year) && (
                    <div style={{ fontSize: `${bSize}px`, color: sidebarTextColor }}>
                      {c.issuer}{c.issuer && c.year ? ' · ' : ''}{c.year}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        <div style={s.main}>
          {/* Summary */}
          {isVisible('summary') && summary_text && (
            <>
              <div style={{ ...s.sectionTitle, marginTop: '0' }}>Professional Summary</div>
              <p style={{ fontSize: '10.5px', color: '#374151', marginBottom: '4px', lineHeight: '1.5' }}>{summary_text}</p>
            </>
          )}

          {/* Experience */}
          {isVisible('experience') && exp.length > 0 && (
            <>
              <div style={s.sectionTitle}>Work Experience</div>
              {exp.map((e, i) => (
                <div key={e.id || i} style={{ marginBottom: '12px', pageBreakInside: 'avoid' as const }}>
                  <div style={s.expHeader}>
                    <span style={s.expTitle}>{e.job_title}</span>
                    <span style={s.date}>{formatDate(e.start_date)} – {formatDate(e.end_date)}</span>
                  </div>
                  <div style={s.company}>{e.company}{e.location ? ` · ${e.location}` : ''}</div>
                  {(e.highlights || []).filter(Boolean).map((h, hi) => (
                    <div key={hi} style={s.bullet}>
                      <span style={{ color: TEAL, flexShrink: 0 }}>▸</span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {/* Education */}
          {isVisible('education') && edu.length > 0 && (
            <>
              <div style={s.sectionTitle}>Education</div>
              {edu.map((e, i) => (
                <div key={e.id || i} style={{ marginBottom: '8px', pageBreakInside: 'avoid' as const }}>
                  <div style={s.expHeader}>
                    <span style={s.expTitle}>{e.degree}</span>
                    <span style={s.date}>{e.year}</span>
                  </div>
                  <div style={s.company}>{e.institution}{e.location ? ` · ${e.location}` : ''}{e.gpa ? ` · GPA: ${e.gpa}` : ''}</div>
                </div>
              ))}
            </>
          )}

          {/* Projects */}
          {isVisible('projects') && projs.length > 0 && (
            <>
              <div style={s.sectionTitle}>Key Projects</div>
              {projs.map((pr, i) => (
                <div key={pr.id || i} style={{ marginBottom: '8px', pageBreakInside: 'avoid' as const }}>
                  <div style={s.expHeader}>
                    <span style={s.expTitle}>{pr.name}</span>
                    {pr.value && <span style={s.date}>{pr.value}</span>}
                  </div>
                  <div style={s.company}>
                    {pr.client && `Client: ${pr.client}`}{pr.role ? ` · Role: ${pr.role}` : ''}
                  </div>
                  {pr.description && <div style={{ fontSize: '10px', color: '#374151' }}>{pr.description}</div>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
