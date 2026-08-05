// Dedicated server-side render page for Puppeteer PDF generation.
// Lives outside /dashboard/ so it inherits only the root layout (no sidebar/nav).
// Puppeteer navigates here (with auth cookies) to capture the PDF.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ResumeData } from '@/lib/resumeTypes'
import { TEMPLATE_STYLE_DEFAULTS } from '@/lib/styleTypes'
import type { StyleSettings } from '@/lib/styleTypes'
import GulfClassic01      from '@/components/templates/GulfClassic01'
import GulfProfessional02 from '@/components/templates/GulfProfessional02'
import ModernClean01      from '@/components/templates/ModernClean01'
import GulfSidebarElite   from '@/components/templates/GulfSidebarElite'
import GulfPhotoHeader    from '@/components/templates/GulfPhotoHeader'
import GulfAccentCard     from '@/components/templates/GulfAccentCard'
import ExecutiveBlack     from '@/components/templates/ExecutiveBlack'
import HealthcareClean    from '@/components/templates/HealthcareClean'
import EngineeringPro     from '@/components/templates/EngineeringPro'
import ModernCreative     from '@/components/templates/ModernCreative'
import MinimalPro         from '@/components/templates/MinimalPro'
import TwoColumnPro       from '@/components/templates/TwoColumnPro'
import BoldStatement      from '@/components/templates/BoldStatement'

export default async function ResumeRenderPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: {
    themeColor?: string
    highlightColor?: string
    accentColor?: string
    textColor?: string
    fontFamily?: string
    nameFontSize?: string
    headingFontSize?: string
    bodyFontSize?: string
  }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: resume } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!resume) return <div>Resume not found</div>

  const resumeData = resume as ResumeData

  // Auto-inject profile photo if resume personal has none
  if (!resumeData.personal?.photo_url) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('photo_url')
      .eq('user_id', user.id)
      .single()
    if (profile?.photo_url) {
      resumeData.personal = { ...(resumeData.personal || {}), photo_url: profile.photo_url } as ResumeData['personal']
    }
  }

  // Merge: template defaults → DB style_settings → searchParam overrides
  const templateId = resumeData.template_id ?? 'gulf-classic-01'
  const defaults   = TEMPLATE_STYLE_DEFAULTS[templateId] ?? TEMPLATE_STYLE_DEFAULTS['gulf-classic-01']
  const dbStyle    = (resume.style_settings as Partial<StyleSettings> | null) ?? {}
  const s: StyleSettings = {
    ...defaults,
    ...dbStyle,
    ...(searchParams.themeColor     ? { headerBg:        searchParams.themeColor }         : {}),
    ...(searchParams.highlightColor ? { sidebarBg:       searchParams.highlightColor }      : {}),
    ...(searchParams.accentColor    ? { accentColor:     searchParams.accentColor }         : {}),
    ...(searchParams.textColor      ? { bodyText:        searchParams.textColor }           : {}),
    ...(searchParams.fontFamily     ? { globalFont:      searchParams.fontFamily }          : {}),
    ...(searchParams.nameFontSize   ? { nameFontSize:    Number(searchParams.nameFontSize) }: {}),
    ...(searchParams.headingFontSize? { headingFontSize: Number(searchParams.headingFontSize) }: {}),
    ...(searchParams.bodyFontSize   ? { bodyFontSize:    Number(searchParams.bodyFontSize) }: {}),
  }

  const Template = (() => {
    switch (templateId) {
      case 'gulf-professional-02': return GulfProfessional02
      case 'modern-clean-01':      return ModernClean01
      case 'gulf-sidebar-elite':   return GulfSidebarElite
      case 'gulf-photo-header':    return GulfPhotoHeader
      case 'gulf-accent-card':     return GulfAccentCard
      case 'executive':            return ExecutiveBlack
      case 'healthcare':           return HealthcareClean
      case 'engineering':          return EngineeringPro
      case 'modern-creative':      return ModernCreative
      case 'minimal-pro':          return MinimalPro
      case 'two-column-pro':       return TwoColumnPro
      case 'bold-statement':       return BoldStatement
      default:                     return GulfClassic01
    }
  })()

  return (
    <>
      {/* Force white background everywhere — prevents dark root layout bleeding into PDF margins */}
      <style>{`
        html, body, #__next, [data-nextjs-scroll-focus-boundary] {
          background: #ffffff !important;
          background-color: #ffffff !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        @page { size: A4; margin: 0; }
      `}</style>
      <div style={{ background: '#ffffff', minHeight: '100vh' }}>
        <Template
          resumeData={resumeData}
          themeColor={s.headerBg}
          highlightColor={s.sidebarBg}
          accentColor={s.accentColor}
          textColor={s.bodyText}
          fontFamily={s.globalFont}
          nameFontSize={s.nameFontSize}
          headingFontSize={s.headingFontSize}
          bodyFontSize={s.bodyFontSize}
        />
      </div>
    </>
  )
}
