// GulfClassic01 — Traditional Gulf CV Template
// Must render identically in browser and Puppeteer
// Width: 794px (A4 at 96 DPI), min-height: 1123px
// Uses only inline styles + basic Tailwind classes safe for Puppeteer

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

export default function GulfClassic01({ resumeData, themeColor, highlightColor, textColor, fontFamily, accentColor, nameFontSize, headingFontSize, bodyFontSize }: Props) {
  const primary = themeColor ?? '#1E3A8A'
  const highlight = highlightColor ?? `${primary}18`
  const bodyText = textColor ?? '#1a1a1a'
  const accent   = accentColor ?? primary
  const nameSize = nameFontSize ?? 22
  const hSize    = headingFontSize ?? 11
  const bSize    = bodyFontSize ?? 9
  const headerTextColor = isLight(primary) ? '#1a1a1a' : '#ffffff'
  const {
    personal = {},
    gulf_fields = {},
    summary_text = '',
    experience_data = [],
    education_data = [],
    skills_data = {},
    certifications_data = [],
    projects_data = [],
    custom_blocks = [],
    block_order = [],
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

  const s = {
    page: {
      width: '794px',
      minHeight: '1123px',
      backgroundColor: '#ffffff',
      fontFamily: fontFamily ?? 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      lineHeight: '1.45',
      color: bodyText,
      margin: '0 auto',
    } as React.CSSProperties,
    header: {
      backgroundColor: primary,
      color: headerTextColor,
      padding: '28px 32px 20px',
    } as React.CSSProperties,
    name: {
      fontSize: `${nameSize}px`,
      fontWeight: '700',
      letterSpacing: '0.5px',
      marginBottom: '4px',
    } as React.CSSProperties,
    contact: {
      fontSize: '10px',
      opacity: 0.85,
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '12px',
      marginTop: '6px',
    } as React.CSSProperties,
    gulfBar: {
      backgroundColor: isLight(primary) ? `${primary}18` : `${primary}CC`,
      color: isLight(primary) ? accent : 'rgba(255,255,255,0.85)',
      fontSize: '9.5px',
      fontWeight: '600',
      padding: '6px 32px',
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '16px',
    } as React.CSSProperties,
    body: {
      padding: '20px 32px 32px',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: `${hSize}px`,
      fontWeight: '700',
      textTransform: 'uppercase' as const,
      letterSpacing: '1.2px',
      color: accent,
      borderBottom: `1.5px solid ${accent}`,
      paddingBottom: '3px',
      marginBottom: '10px',
      marginTop: '18px',
    } as React.CSSProperties,
    expHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: '3px',
    } as React.CSSProperties,
    jobTitle: {
      fontWeight: '700',
      fontSize: '11px',
      color: '#1a1a1a',
    } as React.CSSProperties,
    company: {
      fontSize: '10.5px',
      color: '#374151',
      marginBottom: '4px',
    } as React.CSSProperties,
    date: {
      fontSize: '10px',
      color: '#6B7280',
      whiteSpace: 'nowrap' as const,
    } as React.CSSProperties,
    bullet: {
      display: 'flex',
      gap: '6px',
      marginBottom: '2px',
      fontSize: `${bSize}px`,
      color: '#374151',
    } as React.CSSProperties,
    skillGroup: {
      marginBottom: '5px',
    } as React.CSSProperties,
    skillLabel: {
      fontWeight: '700',
      fontSize: `${bSize}px`,
      color: accent,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    } as React.CSSProperties,
    tag: {
      display: 'inline-block',
      backgroundColor: highlight,
      color: isLight(highlight) ? accent : '#ffffff',
      fontSize: `${bSize}px`,
      padding: '2px 7px',
      borderRadius: '3px',
      margin: '1px 3px 1px 0',
    } as React.CSSProperties,
  }

  const initials = (p.full_name || 'N A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const firstJobTitle = exp.length > 0 ? exp[0].job_title : ''

  const gulfBadges = [
    g.visa_status && `Visa: ${g.visa_status}`,
    g.notice_period && `Notice: ${g.notice_period}`,
    g.gcc_driving_licence && g.gcc_driving_licence !== 'None' && `Licence: ${g.gcc_driving_licence}`,
    g.expected_salary && `Expected: ${g.expected_salary}`,
    g.iqama_transferable !== null && g.iqama_transferable !== undefined && `Iqama: ${g.iqama_transferable ? 'Transferable' : 'Not transferable'}`,
    g.noc_available !== null && g.noc_available !== undefined && `NOC: ${g.noc_available ? 'Available' : 'Not available'}`,
    g.accommodation_pref && `Accommodation: ${g.accommodation_pref}`,
    (g.target_countries || []).length > 0 && `Open to: ${(g.target_countries || []).join(', ')}`,
  ].filter(Boolean) as string[]

  return (
    <div id="resume-render" style={s.page}>
      {/* Header */}
      <div style={{ ...s.header, display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Circular photo */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '3px solid rgba(255,255,255,0.3)',
          backgroundColor: 'rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {p.photo_url
            ? <img src={p.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '22px', fontWeight: '700' }}>{initials}</span>
          }
        </div>
        <div style={{ flex: 1 }}>
        <div style={s.name}>{p.full_name || 'Full Name'}</div>
        {firstJobTitle && (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: '500', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
            {firstJobTitle}
          </div>
        )}
        <div style={s.contact}>
          {p.email && <span>{p.email}</span>}
          {p.phone && <span>{p.phone}</span>}
          {p.address && <span>{p.address}</span>}
          {p.nationality && <span>Nationality: {p.nationality}</span>}
          {p.marital_status && <span>{p.marital_status}</span>}
          {p.date_of_birth && <span>DOB: {p.date_of_birth}</span>}
        </div>
        </div>
      </div>

      {/* Gulf Fields bar */}
      {isVisible('gulf_fields') && gulfBadges.length > 0 && (
        <div style={s.gulfBar}>
          {gulfBadges.map((badge, i) => (
            <span key={i}>◆ {badge}</span>
          ))}
        </div>
      )}

      {/* Body */}
      <div style={s.body}>
        {/* Summary */}
        {isVisible('summary') && summary_text && (
          <>
            <div style={s.sectionTitle}>Professional Summary</div>
            <p style={{ fontSize: '10.5px', color: '#374151', marginBottom: '4px' }}>{summary_text}</p>
          </>
        )}

        {/* Experience */}
        {isVisible('experience') && exp.length > 0 && (
          <>
            <div style={s.sectionTitle}>Work Experience</div>
            {exp.map((e, i) => (
              <div key={e.id || i} style={{ marginBottom: '12px', pageBreakInside: 'avoid' as const }}>
                <div style={s.expHeader}>
                  <span style={s.jobTitle}>{e.job_title}</span>
                  <span style={s.date}>{formatDate(e.start_date)} – {formatDate(e.end_date)}</span>
                </div>
                <div style={s.company}>{e.company}{e.location ? ` · ${e.location}` : ''}</div>
                {(e.highlights || []).filter(Boolean).map((h, hi) => (
                  <div key={hi} style={s.bullet}>
                    <span style={{ color: '#1E3A8A', flexShrink: 0 }}>▸</span>
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
                  <span style={s.jobTitle}>{e.degree}</span>
                  <span style={s.date}>{e.year}</span>
                </div>
                <div style={s.company}>{e.institution}{e.location ? ` · ${e.location}` : ''}{e.gpa ? ` · GPA: ${e.gpa}` : ''}</div>
              </div>
            ))}
          </>
        )}

        {/* Skills */}
        {isVisible('skills') && (
          <>
            {((skills.technical || []).length > 0 || (skills.software || []).length > 0 || (skills.standards || []).length > 0 || (skills.soft || []).length > 0) && (
              <>
                <div style={s.sectionTitle}>Skills</div>
                {(skills.technical || []).length > 0 && (
                  <div style={s.skillGroup}>
                    <span style={s.skillLabel}>Technical: </span>
                    {(skills.technical || []).map((t, i) => <span key={i} style={s.tag}>{t}</span>)}
                  </div>
                )}
                {(skills.software || []).length > 0 && (
                  <div style={s.skillGroup}>
                    <span style={s.skillLabel}>Software: </span>
                    {(skills.software || []).map((t, i) => <span key={i} style={s.tag}>{t}</span>)}
                  </div>
                )}
                {(skills.standards || []).length > 0 && (
                  <div style={s.skillGroup}>
                    <span style={s.skillLabel}>Standards: </span>
                    {(skills.standards || []).map((t, i) => <span key={i} style={s.tag}>{t}</span>)}
                  </div>
                )}
                {(skills.soft || []).length > 0 && (
                  <div style={s.skillGroup}>
                    <span style={s.skillLabel}>Soft Skills: </span>
                    {(skills.soft || []).map((t, i) => <span key={i} style={s.tag}>{t}</span>)}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Certifications */}
        {isVisible('certifications') && certs.length > 0 && (
          <>
            <div style={s.sectionTitle}>Certifications</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 0' }}>
              {certs.map((c, i) => (
                <div key={c.id || i} style={{ width: '50%', marginBottom: '5px', paddingRight: '12px', pageBreakInside: 'avoid' as const }}>
                  <div style={{ fontWeight: '700', fontSize: '10.5px' }}>{c.name}</div>
                  <div style={{ fontSize: '10px', color: '#6B7280' }}>
                    {c.issuer && `${c.issuer}`}{c.year && ` · ${c.year}`}{c.expiry && ` · Exp: ${c.expiry}`}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Projects */}
        {isVisible('projects') && projs.length > 0 && (
          <>
            <div style={s.sectionTitle}>Key Projects</div>
            {projs.map((pr, i) => (
              <div key={pr.id || i} style={{ marginBottom: '8px' }}>
                <div style={s.expHeader}>
                  <span style={s.jobTitle}>{pr.name}</span>
                  {pr.value && <span style={s.date}>{pr.value}</span>}
                </div>
                <div style={s.company}>
                  {pr.client && `Client: ${pr.client}`}{pr.role && ` · Role: ${pr.role}`}
                </div>
                {pr.description && <div style={{ fontSize: '10.5px', color: '#374151' }}>{pr.description}</div>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
