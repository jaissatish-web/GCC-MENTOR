import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
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

type TemplateProps = {
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

const TEMPLATES: Record<string, React.ComponentType<TemplateProps>> = {
  'gulf-classic-01':      GulfClassic01,
  'gulf-professional-02': GulfProfessional02,
  'modern-clean-01':      ModernClean01,
  'gulf-sidebar-elite':   GulfSidebarElite,
  'gulf-photo-header':    GulfPhotoHeader,
  'gulf-accent-card':     GulfAccentCard,
  'executive':            ExecutiveBlack,
  'healthcare':           HealthcareClean,
  'engineering':          EngineeringPro,
  'modern-creative':      ModernCreative,
  'minimal-pro':          MinimalPro,
  'two-column-pro':       TwoColumnPro,
  'bold-statement':       BoldStatement,
}

// POST /api/resumes/[id]/pdf
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch full resume data (including style_settings JSONB)
  const { data: resume } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })

  try {
    // ── Resolve style settings ──────────────────────────────────────────────
    // Priority: request body > DB saved settings > template defaults
    let bodyOverride: Partial<StyleSettings> = {}
    try {
      const body = await request.json()
      // New clients send { styleSettings: {...} }
      if (body?.styleSettings && typeof body.styleSettings === 'object') {
        bodyOverride = body.styleSettings as Partial<StyleSettings>
      } else if (body?.themeColor) {
        // Backward compat: old clients only sent themeColor
        bodyOverride = { headerBg: body.themeColor }
      }
    } catch { /* empty body — use DB / defaults */ }

    const resumeData = resume as ResumeData
    const templateId = resumeData.template_id ?? 'gulf-classic-01'
    const defaults   = TEMPLATE_STYLE_DEFAULTS[templateId] ?? TEMPLATE_STYLE_DEFAULTS['gulf-classic-01']
    const dbStyle    = (resume.style_settings as Partial<StyleSettings> | null) ?? {}
    const s: StyleSettings = { ...defaults, ...dbStyle, ...bodyOverride }

    // Inject profile photo if resume personal has none
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

    // Pick the right template component — falls back to GulfClassic01 for unknown IDs
    const Template = TEMPLATES[templateId] ?? GulfClassic01

    // Render template to static HTML — no Puppeteer navigation, no auth cookies,
    // no dev-server timeouts, no HMR interference.
    // require() at runtime (not static import) to bypass Next.js RSC bundler restriction.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { renderToStaticMarkup } = require('react-dom/server') as typeof import('react-dom/server')
    const bodyHtml = renderToStaticMarkup(
      createElement(Template, {
        resumeData,
        themeColor:      s.headerBg,
        highlightColor:  s.sidebarBg,
        accentColor:     s.accentColor,
        textColor:       s.bodyText,
        fontFamily:      s.globalFont,
        nameFontSize:    s.nameFontSize,
        headingFontSize: s.headingFontSize,
        bodyFontSize:    s.bodyFontSize,
      })
    )

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    html, body { margin: 0; padding: 0; background: #ffffff; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    /* Page 1: no margin — template header fills to the edge */
    @page :first { size: A4; margin: 0; }
    /* Page 2+: standard 14mm top so content doesn't start at raw edge */
    @page { size: A4; margin: 14mm 0 12mm 0; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`

    // ── Launch Puppeteer ──────────────────────────────────────────────────────
    const puppeteer = await import('puppeteer')
    const fs        = await import('fs')

    // Prefer Puppeteer's own cached Chrome, then fall back to system Chrome
    let resolvedExecutable: string | undefined
    try {
      const candidate = (puppeteer as unknown as { executablePath: () => string }).executablePath?.()
      if (candidate && fs.existsSync(candidate)) resolvedExecutable = candidate
    } catch { /* ignore */ }

    if (!resolvedExecutable) {
      const systemCandidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
      ]
      resolvedExecutable = systemCandidates.find(p => fs.existsSync(p))
    }

    const browser = await (puppeteer.default ?? puppeteer).launch({
      headless: true,
      ...(resolvedExecutable ? { executablePath: resolvedExecutable } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123 })

    // setContent injects the HTML directly — no HTTP request, no auth, no timeouts
    await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      // No margin here — let CSS @page :first / @page control per-page margins.
      preferCSSPageSize: false,
    })

    await browser.close()

    const safeName = (resume.name as string)
      .replace(/[^a-zA-Z0-9\-_ ]/g, '')
      .replace(/\s+/g, '_') || 'resume'

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
